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
import { parseVeraResponse, generateClosing, generateReEngagementOpening, generateContextualOpening, generatePeriodInsights } from './lib/api.js'
import { computeSignals, computeNudge } from './lib/signals.js'

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

// ─── Nudge system ─────────────────────────────────────────────────────────────
// computeNudge() is imported from signals.js — handles retry schedule + side effects

// ─── Insights pre-generation ──────────────────────────────────────────────────

async function checkAndPreGenerateInsights() {
  try {
    const today       = new Date()
    const dow         = today.getDay()
    const dom         = today.getDate()
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

    // Weekly — Sunday or Monday
    if (dow === 0 || dow === 1) {
      const prevWeek    = new Date(today); prevWeek.setDate(today.getDate() - 7)
      const prevWeekKey = storageLib.getWeekKey(prevWeek)
      const existing    = storageLib.getWeeklyReview(prevWeekKey)

      if (!existing?.insights) {
        const entries   = storageLib.getEntriesForWeek(prevWeekKey)
        const intention = storageLib.getWeeklyIntention(prevWeekKey)
        const result    = await generatePeriodInsights(entries, intention, false)
        if (result) {
          storageLib.saveWeeklyReview(prevWeekKey, {
            ...(storageLib.getWeeklyReview(prevWeekKey) || {}),
            insights:              result.insights,
            moodWord:              result.moodWord,
            insightsGeneratedAt:   new Date().toISOString(),
          })
        }
      }
    }

    // Monthly — last day or first day of month
    if (dom === daysInMonth || dom === 1) {
      const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const prevMonthKey  = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`
      const existing      = storageLib.getMonthlyReview(prevMonthKey)

      if (!existing?.insights) {
        const entries   = storageLib.getEntriesForMonth(prevMonthKey)
        const intention = storageLib.getMonthlyIntention(prevMonthKey)
        const result    = await generatePeriodInsights(entries, intention, true)
        if (result) {
          storageLib.saveMonthlyReview(prevMonthKey, {
            ...(storageLib.getMonthlyReview(prevMonthKey) || {}),
            insights:              result.insights,
            moodWord:              result.moodWord,
            insightsGeneratedAt:   new Date().toISOString(),
          })
        }
      }
    }
  } catch(e) {
    console.warn('[Vera] checkAndPreGenerateInsights failed silently:', e)
  }
}

// ─── Opening message (async, memory-aware) ────────────────────────────────────

async function buildOpeningMessage(allMessages) {
  const profile  = storageLib.getUserProfile()
  const name     = profile?.name || null
  const nameStr  = name ? `, ${name}` : ''
  const hour     = new Date().getHours()
  const day      = new Date().getDay()
  const signals  = computeSignals(allMessages)

  // New user — no history
  if (signals.daysInactive >= 30 || signals.memorySignal === 'none') {
    if (hour < 12) return `morning${nameStr} — what's on your mind?`
    if (hour < 17) return `hey${nameStr} — how's the day going?`
    return `hey${nameStr} — what's been going on today?`
  }

  // Returning after 3+ days — generate memory-aware opening via AI
  if (signals.daysInactive >= 3) {
    try {
      const opening = await generateReEngagementOpening(signals.daysInactive)
      if (opening) return opening
    } catch (e) { /* fall through */ }
    return `hey${nameStr} — how are you doing?`
  }

  // Returning after 1-2 days — sometimes use contextual AI opening
  if (signals.daysInactive >= 1 && signals.memorySignal === 'available') {
    if (Math.random() > 0.5) {
      try {
        const recentEntries = storageLib.getRecentEntries(3)
        const recentContext = recentEntries.map(e => e.userText.slice(0, 100)).join('\n')
        const opening = await generateContextualOpening(recentContext)
        if (opening) return opening
      } catch (e) { /* fall through */ }
    }
    return `hey${nameStr} — how are you doing?`
  }

  // Same-day return — vary naturally
  const simpleFallbacks = [
    `hey${nameStr} — how are you doing?`,
    `hey${nameStr}. what's going on?`,
    `how've you been${nameStr}?`,
    `hey${nameStr} — how's today been?`,
    `what's been on your mind${nameStr}?`,
  ].filter(Boolean)

  // Time-aware options that don't sound slang-y
  const dayName = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][day]
  if (hour < 12) simpleFallbacks.push(`morning${nameStr} — how are you starting today?`)
  if (hour >= 17 && (day === 0 || day === 6)) simpleFallbacks.push(`${dayName} evening${nameStr} — how's the weekend been?`)
  if (hour >= 17 && day === 5) simpleFallbacks.push(`friday evening${nameStr} — how did the week end up?`)

  return simpleFallbacks[Math.floor(Math.random() * simpleFallbacks.length)]
}

// ─── Conversation initialisation (runs once on mount) ─────────────────────────

async function initialiseConversation(setMessages, setActiveNudge) {
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

  const todayEntries  = storageLib.getEntriesForDate(storageLib.getTodayString())
  const hasTodayConvo = todayEntries.length > 0

  if (!hasTodayConvo) {
    all.push({ type: 'separator', date: storageLib.getTodayString(), label: 'Today' })
    setMessages([...all]) // render history + separator immediately

    // Determine if there's a pending nudge (sets it as active signal for the AI)
    const nudge = computeNudge()
    if (nudge) setActiveNudge(nudge)

    // Opening message — regular regardless of nudge (AI raises it naturally)
    let openingText
    const followUp = storageLib.popPendingFollowUp()
    if (followUp) {
      const profile  = storageLib.getUserProfile()
      const nameStr  = profile?.name ? `, ${profile.name}` : ''
      const typeVerb = {
        'Book': 'finished', 'Film': 'watched', 'Podcast': 'listened to',
        'Article': 'read', 'Other': 'finished',
      }[followUp.type] || 'finished'
      openingText = `hey${nameStr} — you ${typeVerb} ${followUp.title}. what did you make of it?`
    } else {
      openingText = await buildOpeningMessage(all)
    }

    all.push({ type: 'vera', text: openingText, id: 'opening_' + storageLib.getTodayString() })
  }

  setMessages(all)

  // Retroactively close yesterday's thread if it has no closing yet
  await checkAndGenerateClosing(setMessages)

  // Pre-generate period insights in the background (no await — fire and forget)
  checkAndPreGenerateInsights()
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

  setMessages(prev => {
    const todayStr    = storageLib.getTodayString()
    const todaySepIdx = prev.findIndex(m => m.type === 'separator' && m.date === todayStr)
    const endIdx      = todaySepIdx === -1 ? prev.length : todaySepIdx

    const closingMsg = { type: 'vera_closing', text: closingText, id: 'closing_' + yesterdayStr }
    const next = [...prev]
    next.splice(endIdx, 0, closingMsg)
    return next
  })
}

// ─── Components ───────────────────────────────────────────────────────────────

function MainApp({ messages, setMessages, activeNudge, setActiveNudge }) {
  const [activeTab,        setActiveTab]        = React.useState('share')
  const [trackedPatterns,  setTrackedPatterns]  = React.useState(() => storageLib.getTrackedPatterns())
  const [growListVersion,  setGrowListVersion]  = React.useState(0)
  const [intentionVersion, setIntentionVersion] = React.useState(0)

  function refreshPatterns() {
    setTrackedPatterns(storageLib.getTrackedPatterns())
  }

  function refreshGrowList() {
    setGrowListVersion(v => v + 1)
  }

  function refreshIntentions() {
    setIntentionVersion(v => v + 1)
  }

  // Called when a review or intention is saved via conversation
  function handleNudgeAccepted() {
    setActiveNudge(null)
    setIntentionVersion(v => v + 1)
  }

  // Called when user explicitly declines (NUDGE_DECLINED tag fired)
  function handleNudgeDeclined() {
    setActiveNudge(null)
  }

  if (activeTab === 'share') {
    return html`
      <div style=${{ position: 'relative', minHeight: '100dvh' }}>
        <div class="atmos"></div>
        <${Header} />
        <${ShareTab}
          messages=${messages}
          setMessages=${setMessages}
          setActiveTab=${setActiveTab}
          onPatternAdded=${refreshPatterns}
          onListUpdated=${refreshGrowList}
          onIntentionUpdated=${refreshIntentions}
          activeNudge=${activeNudge}
          onNudgeAccepted=${handleNudgeAccepted}
          onNudgeDeclined=${handleNudgeDeclined}
        />
      </div>
    `
  }

  if (activeTab === 'remember') {
    return html`
      <div style=${{ position: 'relative', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <div class="atmos"></div>
        <${Header} />
        <${RememberTab}
          trackedPatterns=${trackedPatterns}
          onPatternDeleted=${refreshPatterns}
        />
        <${BottomNav} activeTab=${activeTab} setActiveTab=${setActiveTab} />
      </div>
    `
  }

  if (activeTab === 'intend') {
    return html`
      <div style=${{ position: 'relative', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <div class="atmos"></div>
        <${Header} />
        <${IntendTab} version=${intentionVersion} />
        <${BottomNav} activeTab=${activeTab} setActiveTab=${setActiveTab} />
      </div>
    `
  }

  if (activeTab === 'grow') {
    return html`
      <div style=${{ position: 'relative', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <div class="atmos"></div>
        <${Header} />
        <${GrowTab}
          trackedPatterns=${trackedPatterns}
          listVersion=${growListVersion}
        />
        <${BottomNav} activeTab=${activeTab} setActiveTab=${setActiveTab} />
      </div>
    `
  }

  return null
}

function App() {
  const [onboardingDone, setOnboardingDone] = React.useState(
    () => storageLib.isOnboardingComplete()
  )
  const [messages,                setMessages]                = React.useState([])
  const [conversationInitialised, setConversationInitialised] = React.useState(false)
  const [activeNudge,             setActiveNudge]             = React.useState(null)

  React.useEffect(() => {
    if (onboardingDone && !conversationInitialised) {
      initialiseConversation(setMessages, setActiveNudge)
      setConversationInitialised(true)
    }
  }, [onboardingDone])

  if (!onboardingDone) {
    return html`<${Onboarding} onComplete=${() => setOnboardingDone(true)} />`
  }

  return html`
    <${MainApp}
      messages=${messages}
      setMessages=${setMessages}
      activeNudge=${activeNudge}
      setActiveNudge=${setActiveNudge}
    />
  `
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
