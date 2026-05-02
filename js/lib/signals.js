import { getEntriesForDate, getRecentEntries, getLivingSummary } from './storage.js'

// Compute all conversation signals before an AI call.
// todayMessages: the current conversation messages array
export function computeSignals(todayMessages = []) {
  const daysInactive = computeDaysInactive()
  return {
    daysInactive,
    emotionalWeight: computeEmotionalWeight(todayMessages),
    questionFatigue: computeQuestionFatigue(todayMessages),
    memorySignal:    computeMemorySignal(),
    returningUser:   daysInactive >= 1,
  }
}

function computeDaysInactive() {
  try {
    const today = new Date()
    for (let i = 1; i <= 30; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const entries = getEntriesForDate(dateStr)
      if (entries && entries.length > 0) return i
    }
    return 30
  } catch (e) { return 0 }
}

function computeEmotionalWeight(messages) {
  const lastUserMsg = [...messages].reverse().find(m => m.type === 'user')
  if (!lastUserMsg) return 'low'

  const text      = lastUserMsg.text.toLowerCase()
  const wordCount = text.split(' ').length

  const highKeywords = [
    'overwhelmed', 'crying', 'cried', "can't cope", 'falling apart',
    'hate myself', 'useless', 'hopeless', 'exhausted', 'breaking',
    'furious', 'terrified', 'panicking', 'grief', 'loss',
    "don't know what to do", "can't do this", 'i give up',
  ]
  const mediumKeywords = [
    'frustrated', 'tired', 'stressed', 'anxious', 'worried',
    'hard', 'difficult', 'struggling', 'rough', 'heavy',
    'sad', 'low', 'flat', 'off', 'weird', 'foggy',
    'migraine', 'headache', 'insomnia', "couldn't sleep", 'angry',
  ]

  if (highKeywords.some(k => text.includes(k)) || wordCount > 80) return 'high'
  if (mediumKeywords.some(k => text.includes(k)) || wordCount > 30) return 'medium'
  return 'low'
}

function computeQuestionFatigue(messages) {
  const recentVera = messages.filter(m => m.type === 'vera').slice(-3)
  return recentVera.filter(m => m.text && m.text.includes('?')).length
}

function computeMemorySignal() {
  try {
    const entries = getRecentEntries(10)
    return entries && entries.length > 2 ? 'available' : 'none'
  } catch (e) { return 'none' }
}

// Format signals as a readable block to inject into the system prompt
export function formatSignals(signals) {
  return [
    '--- Signals ---',
    `DAYS_INACTIVE: ${signals.daysInactive}`,
    `EMOTIONAL_WEIGHT: ${signals.emotionalWeight}`,
    `QUESTION_FATIGUE: ${signals.questionFatigue}`,
    `MEMORY_SIGNAL: ${signals.memorySignal}`,
    `RETURNING_USER: ${signals.returningUser}`,
    '--- End signals ---',
  ].join('\n')
}
