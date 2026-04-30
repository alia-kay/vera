import htm from 'https://unpkg.com/htm?module'
import Header from './components/Header.js'
import BottomNav from './components/BottomNav.js'
import ShareTab from './tabs/Share.js'
import IntendTab from './tabs/Intend.js'
import RememberTab from './tabs/Remember.js'
import GrowTab from './tabs/Grow.js'
import Onboarding from './onboarding/Onboarding.js'

// Storage import ensures migrations run before any component renders
import * as storageLib from './lib/storage.js'
import { buildContextBlock } from './prompts/index.js'
import { parseVeraResponse, generateClosing } from './lib/api.js'

if (localStorage.getItem('vera_debug') === 'true') {
  console.log('[Vera] debug mode active')
}
window.VERA_DEBUG = {
  enable:  () => { localStorage.setItem('vera_debug', 'true');  console.log('[Vera] debug enabled')  },
  disable: () => { localStorage.setItem('vera_debug', 'false'); console.log('[Vera] debug disabled') },
}

const html = htm.bind(React.createElement)

// ─── Date/time helpers ────────────────────────────────────────────────────────

function dateToString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDayLabel(dateStr) {
  const today = storageLib.getTodayString()
  const yd = new Date()
  yd.setDate(yd.getDate() - 1)
  const yesterday = dateToString(yd)

  if (dateStr === today)     return 'Today'
  if (dateStr === yesterday) return 'Yesterday'

  const date  = new Date(dateStr + 'T00:00:00')
  const day   = date.toLocaleDateString('en-US', { weekday: 'short' })
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  return `${day} · ${month} ${date.getDate()}`
}

function formatTime(isoString) {
  return new Date(isoString)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase()
}

// ─── Opening / returning prompts ──────────────────────────────────────────────

function getOpeningPrompt() {
  const profile = storageLib.getUserProfile()
  const name    = profile?.name
  const hour    = new Date().getHours()

  if (name) {
    if (hour < 12) return `Good morning, ${name}. What's on your mind?`
    if (hour < 17) return `Hey ${name} — what's going on today?`
    return `Good evening, ${name}. How did today land for you?`
  }

  if (hour < 12) return `Good morning. What's on your mind?`
  if (hour < 17) return `Hey — what's going on today?`
  return `Good evening. How did today land for you?`
}

function getReturningPrompt() {
  const profile = storageLib.getUserProfile()
  const name    = profile?.name ? `, ${profile.name}` : ''
  const hour    = new Date().getHours()
  const day     = new Date().getDay()

  const prompts = [
    hour < 12
      ? `How are you starting today${name}?`
      : hour < 17
        ? `How's the day going${name}?`
        : `How did today land for you${name}?`,
    `What's on your mind${name}?`,
    day === 1 ? `How's the start of the week feeling${name}?`
      : day === 5 ? `Friday — how are you doing${name}?`
      : day === 0 || day === 6 ? `How's the weekend treating you${name}?`
      : `What's been happening${name}?`,
    `What are you carrying today${name}?`,
  ]

  return prompts[new Date().getDate() % prompts.length]
}

// ─── Conversation initialisation (runs once on mount) ─────────────────────────

async function initialiseConversation(setMessages) {
  const all   = []
  const today = new Date()

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = dateToString(d)
    const entries = storageLib.getEntriesForDate(dateStr)

    if (entries.length > 0) {
      all.push({ type: 'separator', date: dateStr, label: formatDayLabel(dateStr) })
      entries.forEach(entry => {
        if (entry.type === 'vera_closing') {
          all.push({ type: 'vera_closing', text: entry.aiResponse, id: entry.id })
          return
        }
        all.push({ type: 'user', text: entry.userText, time: formatTime(entry.createdAt), id: entry.id })
        if (entry.aiResponse) {
          all.push({ type: 'vera', text: entry.aiResponse, id: entry.id + '_r' })
        }
      })
    }
  }

  const todayEntries     = storageLib.getEntriesForDate(storageLib.getTodayString())
  const hasTodayConvo    = todayEntries.length > 0

  if (all.length === 0) {
    all.push({ type: 'separator', date: storageLib.getTodayString(), label: 'Today' })
    all.push({ type: 'vera', text: getOpeningPrompt(), id: 'opening' })
  } else if (!hasTodayConvo) {
    all.push({ type: 'separator', date: storageLib.getTodayString(), label: 'Today' })
    all.push({ type: 'vera', text: getReturningPrompt(), id: 'daily_' + storageLib.getTodayString() })
  }
  // If user already talked today — just show history, no new prompt

  setMessages(all)

  // Retroactively close yesterday's thread if it has no closing yet
  await checkAndGenerateClosing(setMessages)
}

// ─── Daily closing (retroactive, generated next morning) ──────────────────────

async function checkAndGenerateClosing(setMessages) {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = dateToString(yesterday)

  const yesterdayEntries = storageLib.getEntriesForDate(yesterdayStr)
  if (yesterdayEntries.length === 0) return

  const hasClosing = yesterdayEntries.some(e => e.type === 'vera_closing')
  if (hasClosing) return

  // Build a message list from yesterday's entries so generateClosing can read them
  const yesterdayMessages = []
  yesterdayEntries.forEach(entry => {
    if (entry.userText) yesterdayMessages.push({ type: 'user', text: entry.userText })
    if (entry.aiResponse) yesterdayMessages.push({ type: 'vera', text: entry.aiResponse })
  })

  const closingText = await generateClosing(yesterdayMessages)
  if (!closingText) return

  const closingId = storageLib.generateId()
  storageLib.saveEntry(yesterdayStr, {
    id: closingId,
    createdAt: new Date(yesterdayStr + 'T23:59:00').toISOString(),
    type: 'vera_closing',
    userText: null,
    aiResponse: closingText,
    mood: null,
    detectedSymptoms: [],
    detectedThemes: [],
    freeTags: [],
  })

  // Insert the closing bubble right before today's separator (or at the end)
  setMessages(prev => {
    const todayStr = storageLib.getTodayString()
    const todaySepIdx = prev.findIndex(m => m.type === 'separator' && m.date === todayStr)
    const endIdx = todaySepIdx === -1 ? prev.length : todaySepIdx

    const closingMsg = { type: 'vera_closing', text: closingText, id: 'closing_' + yesterdayStr }
    const next = [...prev]
    next.splice(endIdx, 0, closingMsg)
    return next
  })
}

// ─── Components ───────────────────────────────────────────────────────────────

const OTHER_TABS = {
  intend: IntendTab,
  grow:   GrowTab,
}

function MainApp({ messages, setMessages }) {
  const [activeTab, setActiveTab] = React.useState('share')

  if (activeTab === 'share') {
    return html`
      <div style=${{ position: 'relative', minHeight: '100dvh' }}>
        <div class="atmos"></div>
        <${Header} />
        <${ShareTab}
          messages=${messages}
          setMessages=${setMessages}
          setActiveTab=${setActiveTab}
        />
      </div>
    `
  }

  // Remember tab takes over the full viewport like Share — its own scroll container
  if (activeTab === 'remember') {
    return html`
      <div style=${{ position: 'relative', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <div class="atmos"></div>
        <${Header} />
        <${RememberTab} />
        <${BottomNav} activeTab=${activeTab} setActiveTab=${setActiveTab} />
      </div>
    `
  }

  const TabComponent = OTHER_TABS[activeTab]
  return html`
    <div style=${{ position: 'relative', minHeight: '100dvh' }}>
      <div class="atmos"></div>
      <${Header} />
      <main class="content-area">
        <div class="tab-content" key=${activeTab}>
          <${TabComponent} />
        </div>
      </main>
      <${BottomNav} activeTab=${activeTab} setActiveTab=${setActiveTab} />
    </div>
  `
}

function App() {
  const [onboardingDone, setOnboardingDone] = React.useState(
    () => storageLib.isOnboardingComplete()
  )
  const [messages,               setMessages]               = React.useState([])
  const [conversationInitialised, setConversationInitialised] = React.useState(false)

  React.useEffect(() => {
    if (onboardingDone && !conversationInitialised) {
      initialiseConversation(setMessages)
      setConversationInitialised(true)
    }
  }, [onboardingDone])

  if (!onboardingDone) {
    return html`<${Onboarding} onComplete=${() => setOnboardingDone(true)} />`
  }

  return html`<${MainApp} messages=${messages} setMessages=${setMessages} />`
}

const root = ReactDOM.createRoot(document.getElementById('app'))
root.render(html`<${App} />`)

// DEV ONLY — remove before shipping
window.veraTest = {
  storage: storageLib,
  prompt: () => console.log(buildContextBlock()),
  showPrompt: () => { const p = buildContextBlock(); console.log('%c[Vera system prompt]\n\n' + p, 'color:#E8A030') },
  showContext: () => { const s = storageLib.getLivingSummary(); console.log('[Vera living summary]', s) },
  parse: (raw) => { const r = parseVeraResponse(raw); console.log('[Vera parsed]', r); return r },
  resetOnboarding: () => {
    storageLib.updateUserProfile({ onboardingComplete: false })
    window.location.reload()
  },
  seed: () => {
    const today = storageLib.getTodayString()
    const yesterday = (() => {
      const d = new Date()
      d.setDate(d.getDate() - 1)
      return d.toISOString().split('T')[0]
    })()

    storageLib.saveEntry(yesterday, {
      id: storageLib.generateId(),
      createdAt: new Date(yesterday).toISOString(),
      userText: "I couldn't sleep again last night. Woke up anxious, mind racing about the presentation. Felt exhausted all day and a bit disconnected from everyone.",
      aiResponse: "That kind of night leaves a particular residue — the tiredness isn't just physical, it mixes with everything you're already carrying. What's sitting heaviest about the presentation right now?",
      mood: 2,
      detectedSymptoms: [
        { domain: 'sleep', keyword: "couldn't sleep", userPhrase: "i couldn't sleep again last night" },
        { domain: 'emotional_distress', keyword: 'anxious', userPhrase: 'woke up anxious, mind racing about the presentation' },
        { domain: 'energy_fatigue', keyword: 'exhausted', userPhrase: 'felt exhausted all day and a bit disconnected' }
      ],
      detectedThemes: ['sleep', 'anxiety', 'work'],
      freeTags: []
    })

    storageLib.saveEntry(today, {
      id: storageLib.generateId(),
      createdAt: new Date().toISOString(),
      userText: "Better today. The presentation went fine. Still a bit tired but the dread is gone.",
      aiResponse: "There's something worth sitting with in that gap — between the dread you felt last night and the fine that followed. What do you think was actually driving the anxiety?",
      mood: 4,
      detectedSymptoms: [
        { domain: 'energy_fatigue', keyword: 'tired', userPhrase: 'still a bit tired but the dread is gone' }
      ],
      detectedThemes: ['work', 'relief'],
      freeTags: []
    })

    const weekKey = storageLib.getWeekKey(new Date())
    storageLib.saveWeeklyIntention(weekKey, {
      sentence: 'Show up fully this week without bracing for what might go wrong.',
      focusWord: 'presence',
      items: [
        { id: storageLib.generateId(), text: 'Write in Vera each morning', checked: false, createdAt: new Date().toISOString() },
        { id: storageLib.generateId(), text: 'Leave work by 6pm', checked: true, createdAt: new Date().toISOString() }
      ]
    })

    console.log('Vera: seed data written.', storageLib.exportAllData())
  }
}
