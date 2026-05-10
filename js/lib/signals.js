import {
  getEntriesForDate, getRecentEntries,
  getWeeklyIntention, getMonthlyIntention, getWeekKey, getMonthKey,
} from './storage.js'

// Compute all conversation signals before an AI call.
// todayMessages: the current conversation messages array
export function computeSignals(todayMessages = []) {
  const daysInactive = computeDaysInactive()
  const veraMessages = todayMessages.filter(m => m.type === 'vera' && m.text)
  const userMessages = todayMessages.filter(m => m.type === 'user' && m.text)

  return {
    daysInactive,
    emotionalWeight:      computeEmotionalWeight(todayMessages),
    conversationPressure: computeConversationPressure(userMessages),
    processingStyle:      computeProcessingStyle(userMessages),
    questionFatigue:      computeQuestionFatigue(veraMessages),
    affirmationStreak:    computeAffirmationStreak(veraMessages),
    offerReadiness:       computeOfferReadiness(todayMessages, veraMessages, userMessages),
    lastMode:             computeLastMode(veraMessages),
    memorySignal:         computeMemorySignal(),
    returningUser:        daysInactive >= 1,
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

// veraMessages: pre-filtered array of Vera-only messages
function computeQuestionFatigue(veraMessages) {
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

// Count consecutive Vera responses that were pure affirmation —
// no question, no offer, no reframe, no substantive content.
// veraMessages: pre-filtered array of Vera-only messages
function computeAffirmationStreak(veraMessages) {
  let streak = 0

  for (let i = veraMessages.length - 1; i >= 0; i--) {
    const text = veraMessages[i].text || ''

    const hasQuestion = text.includes('?')

    const offerSignals = [
      'i wonder if', 'something i notice', 'honestly',
      'part of me', 'the way i see it', 'what if',
      'it sounds less like', 'it sounds more like',
      "there's a book", "there's a concept", "there's an idea",
      'there\'s a film', 'there\'s a podcast',
      'one thing that', 'maybe worth',
      'i might be wrong but', 'something worth',
      'can i offer', 'something i want to say', 'something i keep',
      'you keep framing', 'what i hear is', 'what i notice is',
    ]
    const hasOfferLanguage = offerSignals.some(s => text.toLowerCase().includes(s))

    // Long responses with substance break the streak even without explicit offer phrases
    const hasSubstance = text.length > 80 && !isPureAffirmation(text)

    if (hasQuestion || hasOfferLanguage || hasSubstance) break

    streak++
  }

  return streak
}

// Returns true for short acknowledgement responses with no real content
function isPureAffirmation(text) {
  if (text.length > 80) return false

  const lower = text.toLowerCase().trim()
  const affirmationPatterns = [
    /^yeah[\.,…]*/,
    /^hmm[\.,…]*/,
    /^that (sounds|feels|seems)/,
    /^i (hear|understand|see)\b/,
    /^(that|this) makes sense/,
    /^that (must be|can be|is)\b/,
    /^sounds like/,
    /^right[\.,…]*/,
    /^of course/,
    /^absolutely/,
    /^that's (a lot|hard|heavy|tough|rough)/,
    /^ugh[\.,…]*/,
  ]

  return affirmationPatterns.some(p => p.test(lower))
}

// What kind of conversational state is the user in?
// More useful than raw emotion for deciding what to offer.
function computeConversationPressure(userMessages) {
  if (userMessages.length === 0) return 'neutral'

  const recent   = userMessages.slice(-3).map(m => m.text.toLowerCase())
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
  let readiness = 0

  const pressure        = computeConversationPressure(userMessages)
  const style           = computeProcessingStyle(userMessages)
  const weight          = computeEmotionalWeight(todayMessages)
  const affirmStreak    = computeAffirmationStreak(veraMessages)

  // Affirmation streak directly drives offer readiness
  if (affirmStreak >= 2) readiness += 4  // hard rule territory — offer now
  else if (affirmStreak === 1) readiness += 1

  // Pressure signals
  if (pressure === 'rumination')   readiness += 3
  if (pressure === 'seeking')      readiness += 3
  if (pressure === 'self_judgment') readiness += 2
  if (pressure === 'unprocessed')  readiness += 2
  if (style === 'analytical')      readiness += 1
  if (style === 'reflective')      readiness += 1
  if (userMessages.length >= 4)    readiness += 1

  // Decreases
  if (weight === 'high')        readiness -= 2
  if (pressure === 'collapse')  readiness -= 3
  if (userMessages.length <= 2) readiness -= 3

  // Recent offer decay — if last Vera message was long and had no question,
  // she likely already offered something; don't pile on
  if (veraMessages.length > 0) {
    const lastVera = veraMessages[veraMessages.length - 1]
    if (lastVera.text.length > 100 && !lastVera.text.includes('?')) readiness -= 2
  }

  return Math.max(0, Math.min(5, readiness))
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
    'i wonder if', 'honestly this', 'part of me wonders',
  ]
  if (offerPhrases.some(p => lower.includes(p))) return 'OFFER'
  if (hasQuestion)     return 'ASK'
  if (wordCount <= 12) return 'SIT_WITH'
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
    `CONVERSATION_PRESSURE: ${signals.conversationPressure}`,
    `PROCESSING_STYLE: ${signals.processingStyle}`,
    `QUESTION_FATIGUE: ${signals.questionFatigue}`,
    `AFFIRMATION_STREAK: ${signals.affirmationStreak}`,
    `OFFER_READINESS: ${signals.offerReadiness}/5`,
    `LAST_MODE: ${signals.lastMode || 'none'}`,
    `MEMORY_SIGNAL: ${signals.memorySignal}`,
    `RETURNING_USER: ${signals.returningUser}`,
  ]

  if (activeNudge) {
    lines.push(`NUDGE: ${activeNudge.type}`)
    lines.push(`If user responds positively to this nudge, end your response with:`)
    lines.push(`[NUDGE_YES: ${activeNudge.type}]`)
    lines.push(`If user declines or changes subject, end with:`)
    lines.push(`[NUDGE_NO: ${activeNudge.type}]`)
  }

  lines.push('--- End signals ---')
  return lines.join('\n')
}
