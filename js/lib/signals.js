import {
  getEntriesForDate, getRecentEntries,
  getWeeklyIntention, getMonthlyIntention, getWeekKey, getMonthKey,
} from './storage.js'

// Compute all conversation signals before an AI call.
// todayMessages: the current conversation messages array
export function computeSignals(todayMessages = []) {
  const daysInactive = computeDaysInactive()
  const userMessages = todayMessages.filter(m => m.type === 'user' && m.text)
  const veraMessages = todayMessages.filter(m => m.type === 'vera' && m.text)
  return {
    daysInactive,
    emotionalWeight:       computeEmotionalWeight(todayMessages),
    questionFatigue:       computeQuestionFatigue(todayMessages),
    conversationPressure:  computeConversationPressure(userMessages),
    processingStyle:       computeProcessingStyle(userMessages),
    offerReadiness:        computeOfferReadiness(todayMessages, veraMessages, userMessages),
    lastMode:              computeLastMode(veraMessages),
    memorySignal:          computeMemorySignal(),
    returningUser:         daysInactive >= 1,
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
  const veraMessages = messages.filter(m => m.type === 'vera' && m.text)
  if (veraMessages.length === 0) return 0

  let fatigue = 0
  let consecutiveStatements = 0

  for (let i = veraMessages.length - 1; i >= 0 && i >= veraMessages.length - 4; i--) {
    const hasQuestion = veraMessages[i].text.includes('?')
    if (hasQuestion) {
      if (consecutiveStatements >= 2) break
      fatigue++
      consecutiveStatements = 0
    } else {
      consecutiveStatements++
      if (consecutiveStatements >= 2) break
    }
  }

  return fatigue
}

// What kind of conversational state is the user in?
// More useful than raw emotion for deciding what to offer.
function computeConversationPressure(userMessages) {
  if (userMessages.length === 0) return 'neutral'

  const recent  = userMessages.slice(-3).map(m => m.text.toLowerCase())
  const combined = recent.join(' ')

  const selfJudgmentKeywords = [
    'useless', 'terrible', "can't do anything", 'failure', "i'm such a mess",
    'hate myself', 'so bad at', "i'm awful", 'worthless', 'embarrassing',
    "shouldn't have", "i'm the worst", 'such an idiot', 'pathetic',
  ]
  const collapseKeywords = [
    "can't cope", 'giving up', 'falling apart', "can't do this",
    'i give up', 'too much', 'breaking point', 'breaking down', 'done with it',
  ]
  const ruminationKeywords = [
    'again', 'always', 'never', 'every time', 'keeps happening',
    'same thing', 'nothing changes', 'like always', 'same as always',
    'why does this', 'this always',
  ]
  const seekingKeywords = [
    'what should i', 'how do i', 'what do you think', 'any advice',
    "i don't know what to do", 'what would you', 'do you think i should',
    'what should', 'help me', 'not sure what',
  ]

  if (selfJudgmentKeywords.some(k => combined.includes(k))) return 'self_judgment'
  if (collapseKeywords.some(k => combined.includes(k)))      return 'collapse'

  const ruminationHits = ruminationKeywords.filter(k => combined.includes(k)).length
  if (ruminationHits >= 2) return 'rumination'

  if (seekingKeywords.some(k => combined.includes(k))) return 'seeking'

  // Unprocessed: last message is long and dense
  const lastMsg = recent[recent.length - 1] || ''
  if (lastMsg.split(' ').length > 60) return 'unprocessed'

  return 'neutral'
}

// How is the user processing what they're sharing?
function computeProcessingStyle(userMessages) {
  if (userMessages.length === 0) return 'raw'

  const recent = userMessages.slice(-3).map(m => m.text.toLowerCase()).join(' ')

  const analyticalKeywords = [
    'because', 'therefore', 'the reason', 'logically', 'technically',
    'in theory', 'objectively', 'makes sense that', 'i think the issue is',
    'what this means', 'the problem is that', 'it follows that',
  ]
  const reflectiveKeywords = [
    'i think', 'i realize', 'i notice', 'i feel like', 'something about',
    'i wonder', 'i keep', "i've been thinking", 'reflecting on', 'i suppose',
    'it makes me', 'i find myself',
  ]

  const analyticalCount = analyticalKeywords.filter(k => recent.includes(k)).length
  const reflectiveCount = reflectiveKeywords.filter(k => recent.includes(k)).length

  if (analyticalCount >= 2) return 'analytical'
  if (reflectiveCount >= 2) return 'reflective'
  return 'raw'
}

// How ready is the user to receive an offer (reframe, insight, practical suggestion)?
// 0 = not ready, 5 = actively seeking
function computeOfferReadiness(todayMessages, veraMessages, userMessages) {
  if (userMessages.length < 2) return 0

  let score = 0

  // Conversation has gone on long enough to have real material
  if (todayMessages.length >= 6)  score += 1
  if (todayMessages.length >= 12) score += 1

  // Vera has been in listening/affirming mode for several turns
  const recentVera      = veraMessages.slice(-4)
  const statementCount  = recentVera.filter(m => !m.text.includes('?')).length
  if (statementCount >= 2) score += 1
  if (statementCount >= 3) score += 1

  // User's conversational pressure
  const pressure = computeConversationPressure(userMessages)
  if (pressure === 'seeking')    score += 2
  if (pressure === 'rumination') score += 1

  // User has an active intention set — more context to build on
  try {
    const weekKey  = getWeekKey(new Date())
    const monthKey = getMonthKey(new Date())
    const weekInt  = getWeeklyIntention(weekKey)
    const monthInt = getMonthlyIntention(monthKey)
    if (weekInt?.focus || monthInt?.focus) score += 1
  } catch (e) {}

  // High emotional weight = still too raw to receive something
  const weight = computeEmotionalWeight(todayMessages)
  if (weight === 'high') score -= 1

  // Collapse/self-judgment = not ready for offers yet
  if (pressure === 'collapse' || pressure === 'self_judgment') score -= 2

  return Math.max(0, Math.min(5, score))
}

// What mode was Vera in on her last response?
function computeLastMode(veraMessages) {
  if (veraMessages.length === 0) return null

  const last = veraMessages[veraMessages.length - 1].text
  if (!last) return null

  const lower     = last.toLowerCase()
  const hasQuestion = last.includes('?')
  const wordCount   = last.split(' ').length

  const offerPhrases = [
    'can i offer', 'something i want to say', 'something i keep',
    'i keep wanting to name', 'what i hear is', 'what i notice is',
    'you keep framing', "here's what i think", "i want to offer",
  ]
  if (offerPhrases.some(p => lower.includes(p))) return 'OFFER'
  if (hasQuestion)       return 'ASK'
  if (wordCount <= 12)   return 'SIT_WITH'
  return 'LISTEN'
}

function computeMemorySignal() {
  try {
    const entries = getRecentEntries(10)
    return entries && entries.length > 2 ? 'available' : 'none'
  } catch (e) { return 'none' }
}

// Format signals as a readable block to inject into the system prompt
export function formatSignals(signals, activeNudge = null) {
  const lines = [
    '--- Signals ---',
    `DAYS_INACTIVE: ${signals.daysInactive}`,
    `EMOTIONAL_WEIGHT: ${signals.emotionalWeight}`,
    `QUESTION_FATIGUE: ${signals.questionFatigue}`,
    `CONVERSATION_PRESSURE: ${signals.conversationPressure}`,
    `PROCESSING_STYLE: ${signals.processingStyle}`,
    `OFFER_READINESS: ${signals.offerReadiness}`,
    `LAST_MODE: ${signals.lastMode ?? 'null'}`,
    `MEMORY_SIGNAL: ${signals.memorySignal}`,
    `RETURNING_USER: ${signals.returningUser}`,
  ]

  if (activeNudge) {
    lines.push(`ACTIVE_NUDGE: ${activeNudge.type}`)
    lines.push(`If user responds positively to this nudge, end your response with:`)
    lines.push(`[NUDGE_YES: ${activeNudge.type}]`)
    lines.push(`If user declines or changes subject, end with:`)
    lines.push(`[NUDGE_NO: ${activeNudge.type}]`)
  }

  lines.push('--- End signals ---')
  return lines.join('\n')
}
