import htm from 'https://unpkg.com/htm?module'
import {
  getEntriesForDate,
  saveEntry,
  getTodayString,
  generateId,
  getUserProfile
} from '../lib/storage.js'
import { scanForSymptoms } from '../lib/scanner.js'
import ChatBubble from '../components/ChatBubble.js'
import DaySeparator from '../components/DaySeparator.js'
import InputBar from '../components/InputBar.js'

const html = htm.bind(React.createElement)

// ─── Placeholder responses ────────────────────────────────────────────────────

const PLACEHOLDER_RESPONSES = [
  "What you're carrying sounds real. What's the part that's sitting heaviest right now?",
  "Tell me more about that — what does it feel like from the inside?",
  "That makes sense. What was going through your mind when it happened?",
  "I'm listening. What would it mean for you if things were different?",
  "There's something in what you said. What do you think is underneath it?",
  "That sounds like it's been building for a while. When did you first notice it?",
]

let placeholderIndex = 0
function getPlaceholderResponse() {
  const r = PLACEHOLDER_RESPONSES[placeholderIndex % PLACEHOLDER_RESPONSES.length]
  placeholderIndex++
  return r
}

// ─── Greeting prompts ─────────────────────────────────────────────────────────

function getOpeningPrompt() {
  const profile = getUserProfile()
  const name = profile?.name
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return name ? `${greeting}, ${name}. What's on your mind?` : `${greeting}. What's on your mind?`
}

function getDailyPrompt() {
  const hour = new Date().getHours()
  if (hour < 12) return "How are you starting today?"
  if (hour < 17) return "How's the day going?"
  return "How did today land for you?"
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function dateToString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDayLabel(dateStr) {
  const today = getTodayString()
  const yd = new Date()
  yd.setDate(yd.getDate() - 1)
  const yesterday = dateToString(yd)

  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'

  const date = new Date(dateStr + 'T00:00:00')
  const day   = date.toLocaleDateString('en-US', { weekday: 'short' })
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  return `${day} · ${month} ${date.getDate()}`
}

function formatTime(isoString) {
  return new Date(isoString)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase()
}

// ─── Share tab ────────────────────────────────────────────────────────────────

export default function ShareTab({ setActiveTab }) {
  const [messages,   setMessages]   = React.useState([])
  const [inputText,  setInputText]  = React.useState('')
  const [isThinking, setIsThinking] = React.useState(false)
  const chatEndRef = React.useRef(null)

  React.useEffect(() => { loadHistory() }, [])

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  function loadHistory() {
    const all = []
    const today = new Date()

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr  = dateToString(d)
      const entries  = getEntriesForDate(dateStr)

      if (entries.length > 0) {
        all.push({ type: 'separator', date: dateStr, label: formatDayLabel(dateStr) })
        entries.forEach(entry => {
          all.push({ type: 'user', text: entry.userText, time: formatTime(entry.createdAt), id: entry.id })
          if (entry.aiResponse) {
            all.push({ type: 'vera', text: entry.aiResponse, id: entry.id + '_response' })
          }
        })
      }
    }

    if (all.length === 0) {
      all.push({ type: 'vera', text: getOpeningPrompt(), id: 'opening' })
    } else {
      const todayHasEntries = getEntriesForDate(getTodayString()).length > 0
      if (!todayHasEntries) {
        all.push({ type: 'separator', date: getTodayString(), label: 'Today' })
      }
      all.push({ type: 'vera', text: getDailyPrompt(), id: 'daily_prompt' })
    }

    setMessages(all)
  }

  async function handleSend() {
    const userText = inputText.trim()
    if (!userText || isThinking) return

    setInputText('')
    setIsThinking(true)

    const now     = new Date().toISOString()
    const entryId = generateId()

    const userMsg = { type: 'user', text: userText, time: formatTime(now), id: entryId }
    setMessages(prev => [...prev, userMsg])

    // TODO: replace with AI call when AI is connected in a later step
    await new Promise(resolve => setTimeout(resolve, 600))

    const veraText = getPlaceholderResponse()
    const veraMsg  = { type: 'vera', text: veraText, id: entryId + '_response' }
    setMessages(prev => [...prev, veraMsg])
    setIsThinking(false)

    const { detected, freeTags } = scanForSymptoms(userText)

    saveEntry(getTodayString(), {
      id: entryId,
      createdAt: now,
      userText,
      aiResponse: veraText,
      mood: null,
      detectedSymptoms: detected,
      detectedThemes: [],
      freeTags
    })
  }

  return html`
    <div style=${{ height: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div class="share-atmos"></div>

      <div class="chat">
        ${messages.map(m => {
          if (m.type === 'separator') {
            return html`<${DaySeparator} key=${m.date} label=${m.label} />`
          }
          return html`<${ChatBubble} key=${m.id} type=${m.type} text=${m.text} time=${m.time} />`
        })}
        ${isThinking && html`<${ChatBubble} type="thinking" />`}
        <div ref=${chatEndRef}></div>
      </div>

      <${InputBar}
        value=${inputText}
        onChange=${setInputText}
        onSend=${handleSend}
        disabled=${isThinking}
        onTabChange=${setActiveTab}
      />
    </div>
  `
}
