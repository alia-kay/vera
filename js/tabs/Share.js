import htm from 'https://unpkg.com/htm?module'
import {
  saveEntry,
  getTodayString,
  generateId,
  shouldRegenerateSummary,
  elevatePatterns,
  recomputePatternCounts,
} from '../lib/storage.js'
import { scanForSymptoms } from '../lib/scanner.js'
import { sendMessage, regenerateSummary } from '../lib/api.js'
import ChatBubble from '../components/ChatBubble.js'
import DaySeparator from '../components/DaySeparator.js'
import InputBar from '../components/InputBar.js'

const html = htm.bind(React.createElement)

function formatTime(isoString) {
  return new Date(isoString)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase()
}

export default function ShareTab({ messages, setMessages, setActiveTab }) {
  const [inputText,  setInputText]  = React.useState('')
  const [isThinking, setIsThinking] = React.useState(false)
  const chatEndRef = React.useRef(null)

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  async function handleSend() {
    const userText = inputText.trim()
    if (!userText || isThinking) return

    setInputText('')
    setIsThinking(true)

    const now     = new Date().toISOString()
    const entryId = generateId()

    setMessages(prev => [...prev, { type: 'user', text: userText, time: formatTime(now), id: entryId }])

    try {
      const { displayText } = await sendMessage(userText, messages)

      setMessages(prev => [...prev, { type: 'vera', text: displayText, id: entryId + '_response' }])

      const { detected, freeTags } = scanForSymptoms(userText)
      saveEntry(getTodayString(), {
        id: entryId,
        createdAt: now,
        userText,
        aiResponse: displayText,
        mood: null,
        detectedSymptoms: detected,
        detectedThemes: [],
        freeTags,
      })

      try {
        elevatePatterns()
        recomputePatternCounts()
      } catch (err) {
        console.warn('Pattern maintenance failed silently:', err)
      }

      if (shouldRegenerateSummary()) {
        regenerateSummary().catch(err => console.warn('Summary regeneration failed silently:', err))
      }
    } catch (err) {
      console.error('[Vera] sendMessage failed:', err)
      setMessages(prev => [...prev, {
        type: 'vera',
        text: "I'm here. Something went quiet on my end — try again in a moment.",
        id: entryId + '_err',
      }])
    } finally {
      setIsThinking(false)
    }
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
