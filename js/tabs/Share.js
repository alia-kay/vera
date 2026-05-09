import htm from 'https://unpkg.com/htm?module'
import {
  saveEntry,
  getTodayString,
  generateId,
  shouldRegenerateSummary,
  elevatePatterns,
  recomputePatternCounts,
  markListItemDone,
  addToList,
  removeFromList,
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

export default function ShareTab({
  messages, setMessages, setActiveTab,
  onPatternAdded, onListUpdated,
  activeNudge, onNudgeAccepted, onNudgeDeclined,
}) {
  const [inputText,  setInputText]  = React.useState('')
  const [isStreaming, setIsStreaming] = React.useState(false)
  const chatEndRef = React.useRef(null)

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const userText = inputText.trim()
    if (!userText || isStreaming) return

    setInputText('')
    setIsStreaming(true)

    const now    = new Date().toISOString()
    const userId = generateId()
    const veraId = generateId()

    const userMsg = { type: 'user', text: userText, time: formatTime(now), id: userId }
    const messagesWithUser = [...messages, userMsg]

    // Show user message + empty vera bubble immediately
    setMessages([...messagesWithUser, { type: 'vera', text: '', id: veraId, streaming: true }])

    let rawAccumulated = ''

    try {
      const result = await sendMessage(
        userText,
        messagesWithUser,
        activeNudge,
        (chunk) => {
          rawAccumulated += chunk
          // Strip any partial tags mid-stream for display
          const liveText = rawAccumulated
            .replace(/\[TRACK:[^\]]*$/i, '')
            .replace(/\[DONE:[^\]]*$/i, '')
            .replace(/\[AHEAD:[^\]]*$/i, '')
            .replace(/\[ADD:[^\]]*$/i, '')
            .replace(/\[REMOVE:[^\]]*$/i, '')
            .replace(/\[NUDGE[^\]]*$/i, '')
            .trimEnd()

          setMessages(prev => prev.map(m =>
            m.id === veraId ? { ...m, text: liveText, streaming: true } : m
          ))
        }
      )

      // Stream done — set final clean text, mark not streaming
      setMessages(prev => prev.map(m =>
        m.id === veraId ? { ...m, text: result.displayText, streaming: false } : m
      ))

      // Save entry
      const { detected, freeTags } = scanForSymptoms(userText)
      const symptomsToLog = result.newPattern
        ? detected.filter(occ => {
            const words = result.newPattern.name.toLowerCase().split(/\s+/).filter(w => w.length >= 3)
            return !words.some(w => occ.keyword.toLowerCase().includes(w))
          })
        : detected

      saveEntry(getTodayString(), {
        id: userId,
        createdAt: now,
        userText,
        aiResponse: result.displayText,
        mood: null,
        detectedSymptoms: symptomsToLog,
        detectedThemes: [],
        freeTags,
      })

      // Handle tags
      if (result.aheadItem) {
        addToList({
          id: generateId(),
          title: result.aheadItem.title,
          author: result.aheadItem.author || null,
          type: result.aheadItem.type,
          status: 'ahead',
          addedAt: new Date().toISOString(),
          completedAt: null,
        })
        if (onListUpdated) onListUpdated()
      }

      if (result.newPattern && onPatternAdded) onPatternAdded()

      if (result.doneItem) {
        markListItemDone(result.doneItem)
        if (onListUpdated) onListUpdated()
      }

      if (result.newListItem) {
        addToList({
          id: generateId(),
          title: result.newListItem.title,
          author: result.newListItem.author || null,
          type: result.newListItem.type || 'Other',
          status: 'ahead',
          addedAt: new Date().toISOString(),
          completedAt: null,
        })
        if (onListUpdated) onListUpdated()
      }

      if (result.removeTitle) {
        removeFromList(result.removeTitle)
        if (onListUpdated) onListUpdated()
      }

      if (result.nudgeYes && onNudgeAccepted) onNudgeAccepted(result.nudgeYes)
      if (result.nudgeNo  && onNudgeDeclined) onNudgeDeclined()

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
      setMessages(prev => prev.map(m =>
        m.id === veraId
          ? { ...m, text: "I'm here. Something went quiet on my end — try again in a moment.", streaming: false }
          : m
      ))
    } finally {
      setIsStreaming(false)
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
          return html`<${ChatBubble}
            key=${m.id}
            type=${m.type}
            text=${m.text}
            time=${m.time}
            streaming=${m.streaming}
          />`
        })}
        <div ref=${chatEndRef}></div>
      </div>

      <${InputBar}
        value=${inputText}
        onChange=${setInputText}
        onSend=${handleSend}
        disabled=${isStreaming}
        onTabChange=${setActiveTab}
      />
    </div>
  `
}
