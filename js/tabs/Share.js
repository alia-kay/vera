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
  getWeeklyIntention, saveWeeklyIntention,
  getMonthlyIntention, saveMonthlyIntention,
  getWeeklyReview, saveWeeklyReview,
  getMonthlyReview, saveMonthlyReview,
  getWeekKey, getMonthKey,
  markNudgeDeclined,
} from '../lib/storage.js'
import { scanForSymptoms } from '../lib/scanner.js'
import { sendMessage, regenerateSummary } from '../lib/api.js'
import ChatBubble from '../components/ChatBubble.js'
import DaySeparator from '../components/DaySeparator.js'
import InputBar from '../components/InputBar.js'

const WEEKLY_QUESTIONS = [
  'How did this week actually feel?',
  'What was the hardest moment this week — and what was the best one?',
  'What do you want to carry forward from this week?',
]
const MONTHLY_QUESTIONS = [
  'How would you describe the shape of this month?',
  'What shifted in you — even slightly — that you want to carry forward?',
  'What do you want to move toward next month?',
]

const html = htm.bind(React.createElement)

function splitVeraMessage(text) {
  if (text.length <= 200) return [text]

  const sentences = text.match(/[^.!?]+[.!?]+["']?/g) || [text]

  const parts = []
  let current = ''

  for (const sentence of sentences) {
    if ((current + sentence).length > 220 && current.length > 60) {
      parts.push(current.trim())
      current = sentence
    } else {
      current += sentence
    }
  }
  if (current.trim()) parts.push(current.trim())

  if (parts.length > 3) {
    return [
      parts.slice(0, parts.length - 2).join(' '),
      parts[parts.length - 2],
      parts[parts.length - 1],
    ]
  }

  return parts.length > 1 ? parts : [text]
}

function formatTime(isoString) {
  return new Date(isoString)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase()
}

export default function ShareTab({
  messages, setMessages, setActiveTab,
  onPatternAdded, onListUpdated, onIntentionUpdated,
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
            .replace(/\[SAVE_INTENTION:[^\]]*$/i, '')
            .replace(/\[SAVE_REVIEW:[^\]]*$/i, '')
            .trimEnd()

          setMessages(prev => prev.map(m =>
            m.id === veraId ? { ...m, text: liveText, streaming: true } : m
          ))
        }
      )

      // Stream done — split into bubbles if long
      const parts = splitVeraMessage(result.displayText)

      if (parts.length === 1) {
        setMessages(prev => prev.map(m =>
          m.id === veraId ? { ...m, text: parts[0], streaming: false } : m
        ))
      } else {
        setMessages(prev => prev.filter(m => m.id !== veraId))
        for (let i = 0; i < parts.length; i++) {
          if (i > 0) await new Promise(resolve => setTimeout(resolve, 400))
          const partId = veraId + '_' + i
          setMessages(prev => [...prev, {
            type: 'vera',
            text: parts[i],
            id: partId,
            streaming: false,
            splitIndex: i,
            splitTotal: parts.length,
          }])
        }
      }

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

      if (result.nudgeDeclined) {
        // Permanently decline so the retry schedule stops for this period
        if (activeNudge) {
          const periodKey = activeNudge.weekKey || activeNudge.monthKey
          const prefixMap = {
            weekly_review:    'weekly_review',
            weekly_intention: 'weekly_intend',
            monthly_review:   'monthly_review',
            monthly_intention:'monthly_intend',
          }
          const prefix = prefixMap[activeNudge.type]
          if (prefix && periodKey) markNudgeDeclined(`${prefix}_${periodKey}`)
        }
        if (onNudgeDeclined) onNudgeDeclined()
      }

      if (result.saveReview) {
        const { period, weekKey, monthKey, checkedItems, q1, q2, q3 } = result.saveReview
        const isMonthly = period === 'monthly'
        const key       = weekKey || monthKey || (isMonthly ? getMonthKey(new Date()) : getWeekKey(new Date()))
        const answers   = [q1 || '', q2 || '', q3 || '']
        const questions = isMonthly ? MONTHLY_QUESTIONS : WEEKLY_QUESTIONS

        // Mark checklist items done if specified
        if (checkedItems) {
          const checkedIds = checkedItems.split(',').map(s => s.trim()).filter(Boolean)
          const intention  = isMonthly ? getMonthlyIntention(key) : getWeeklyIntention(key)
          if (intention && checkedIds.length > 0) {
            intention.items = (intention.items || []).map(item => ({
              ...item,
              checked: checkedIds.includes(item.id) ? true : item.checked,
            }))
            isMonthly ? saveMonthlyIntention(key, intention) : saveWeeklyIntention(key, intention)
          }
        }

        // Preserve pre-generated insights; only save answers + questions
        const existing = isMonthly ? getMonthlyReview(key) : getWeeklyReview(key)
        const saveFn   = isMonthly ? saveMonthlyReview : saveWeeklyReview
        saveFn(key, {
          ...(existing || {}),
          completedAt: new Date().toISOString(),
          questions,
          answers,
          moodWord: existing?.moodWord || answers[0]?.slice(0, 30) || '',
        })

        if (onIntentionUpdated) onIntentionUpdated()
        if (onNudgeAccepted)    onNudgeAccepted()
      }

      if (result.saveIntention) {
        const { period, weekKey, monthKey, sentence, focus, items } = result.saveIntention
        const isMonthly = period === 'monthly'
        const key       = weekKey || monthKey || (isMonthly ? getMonthKey(new Date()) : getWeekKey(new Date()))

        const intentionData = {
          sentence:   sentence || '',
          focusWords: focus ? focus.split(',').map(s => s.trim()).filter(Boolean) : [],
          items:      items  ? items.split(',').map(text => ({
            id: generateId(), text: text.trim(), checked: false,
          })).filter(i => i.text) : [],
          createdAt:  new Date().toISOString(),
          updatedAt:  new Date().toISOString(),
        }

        isMonthly ? saveMonthlyIntention(key, intentionData) : saveWeeklyIntention(key, intentionData)

        if (onIntentionUpdated) onIntentionUpdated()
        if (onNudgeAccepted)    onNudgeAccepted()
      }

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
            splitIndex=${m.splitIndex}
            splitTotal=${m.splitTotal}
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
