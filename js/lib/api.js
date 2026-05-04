import { buildContextBlock, PROMPTS } from '../prompts/index.js'
import { computeSignals, formatSignals } from './signals.js'
import {
  getLivingSummary,
  saveLivingSummary,
  getRecentEntries,
  addCustomPattern,
  getTodayString,
} from './storage.js'

// ─── Provider config ──────────────────────────────────────────────────────────

const AI_ENDPOINT    = 'https://api.anthropic.com/v1/messages'
const AI_MODEL       = 'claude-haiku-4-5-20251001'
const _ENC_KEY       = 'vera-mv-2024-xk'
const _ENC_API_KEY   = 'BQ5fAEMZW0xCWQIHABc7QigUCkcsGRl1QQBrXRkGHQE+GWcbKVtiRWZjex0lAjA+UBkLFE5EQmR+ZzIBAwICVEIEEnlmUlh4WzkuHAkdOE4IH114AAtxfik7Li01B1wKPkxzHQN2SDBcESQz'
const AI_API_KEY     = atob(_ENC_API_KEY).split('').map((c, i) =>
  String.fromCharCode(c.charCodeAt(0) ^ _ENC_KEY.charCodeAt(i % _ENC_KEY.length))
).join('')
const MAX_TOKENS_CONVERSATION = 1000
const MAX_TOKENS_SUMMARY      = 500

const DEBUG = () => localStorage.getItem('vera_debug') === 'true'

// ─── Core API call ────────────────────────────────────────────────────────────

export async function callAI(systemPrompt, messages, maxTokens = MAX_TOKENS_CONVERSATION) {
  if (!AI_API_KEY) throw new Error('No API key configured. Set AI_API_KEY in js/lib/api.js')

  const body = {
    model: AI_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: messages,
  }

  if (DEBUG()) {
    console.group('[Vera] callAI')
    console.log('system:', systemPrompt)
    console.log('messages:', messages)
    console.groupEnd()
  }

  const res = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': AI_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`AI request failed (${res.status}): ${err}`)
  }

  const data = await res.json()
  const text = data?.content?.[0]?.text

  if (!text) throw new Error('AI returned an empty response')

  if (DEBUG()) console.log('[Vera] raw response:', text)

  return text
}

// ─── Response parsing ─────────────────────────────────────────────────────────

export function parseVeraResponse(rawResponse) {
  const trackMatch  = rawResponse.match(/\[TRACK:\s*(.+?)\s*\|\s*domain:\s*(.+?)\]/i)
  const displayText = rawResponse.replace(/\[TRACK:.*?\]/gi, '').trim()
  const newPattern  = trackMatch
    ? { name: trackMatch[1].trim(), domain: trackMatch[2].trim().toLowerCase() }
    : null
  return { displayText, newPattern }
}

// ─── Send message ─────────────────────────────────────────────────────────────

export async function sendMessage(userText, allMessages = []) {
  // Filter to today's conversation only — gives Vera full memory of today's thread
  const todayStr = getTodayString()
  let todayStartIdx = 0
  allMessages.forEach((m, i) => {
    if (m.type === 'separator' && m.date === todayStr) todayStartIdx = i + 1
  })
  const todayMessages = allMessages.slice(todayStartIdx)

  // Compute signals and build final system prompt
  const signals      = computeSignals(todayMessages)
  const signalsBlock = formatSignals(signals)
  const systemPrompt = buildContextBlock() + '\n\n' + signalsBlock

  // Build alternating user/assistant turns from today's history
  const historyMessages = []
  for (const msg of todayMessages) {
    if (msg.type === 'user' && msg.text) {
      historyMessages.push({ role: 'user', content: msg.text })
    } else if (msg.type === 'vera' && msg.text) {
      historyMessages.push({ role: 'assistant', content: msg.text })
    }
    // Skip separators, vera_closing, thinking indicators
  }

  // Append current user message
  historyMessages.push({ role: 'user', content: userText })

  if (DEBUG()) {
    console.group('[Vera] AI call')
    console.log('Signals:', signals)
    console.log('System prompt:\n', systemPrompt)
    console.log('History turns:', historyMessages.length - 1)
    console.groupEnd()
  }

  const rawResponse = await callAI(systemPrompt, historyMessages)
  const { displayText, newPattern } = parseVeraResponse(rawResponse)

  if (newPattern) {
    addCustomPattern(newPattern.name)
    if (DEBUG()) console.log('[Vera] new pattern tracked:', newPattern)
  }

  return { displayText, newPattern }
}

// ─── Summary regeneration ─────────────────────────────────────────────────────

export async function regenerateSummary() {
  const entries  = getRecentEntries(20)
  if (entries.length === 0) return

  const existing = getLivingSummary()
  const prompt   = existing?.summary
    ? PROMPTS.buildSummaryPrompt(entries, existing.summary)
    : PROMPTS.buildFirstSummaryPrompt(entries)

  const newText = await callAI(
    prompt,
    [{ role: 'user', content: 'Generate the summary now.' }],
    MAX_TOKENS_SUMMARY
  )

  saveLivingSummary(newText)

  if (DEBUG()) console.log('[Vera] summary regenerated:', newText)
}

// ─── Weekly review generation ─────────────────────────────────────────────────

export async function generateWeeklyReview(answers, questions, intention, isMonthly = false) {
  const prompt = PROMPTS.weeklyReview(answers, questions, intention, isMonthly)

  try {
    const raw = await callAI(
      'You are a precise, empathetic observer. Return only valid JSON as instructed.',
      [{ role: 'user', content: prompt }],
      400
    )
    const clean = raw.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch (err) {
    console.warn('Weekly review generation failed:', err)
    return {
      insights: ['Something meaningful happened — worth sitting with.'],
      moodWord: 'Present',
    }
  }
}

// ─── Re-engagement opening (3+ days away) ────────────────────────────────────

export async function generateReEngagementOpening(daysInactive) {
  const recentEntries = getRecentEntries(5)
  if (!recentEntries || recentEntries.length === 0) return null

  const recentContext = recentEntries
    .slice(0, 3)
    .map(e => e.userText.slice(0, 120))
    .join('\n')

  const prompt = `\
You are Vera — a close, warm friend. The user hasn't opened the app in ${daysInactive} days.

Here is what they last talked about:
${recentContext}

Write ONE short opening message (1 sentence, 2 at most) that:
- Acknowledges they've been away without making it a big deal
- References something specific from what they last shared if it feels natural
- Feels like a friend texting, not an app notification
- Uses natural, casual phrasing — lowercase is fine
- Does NOT start with "I"
- Does NOT use therapy language or over-validation
- Does NOT use exclamation points or em dashes

Good tone examples:
"hey, it's been a few days — what's been going on?"
"last time you were here work felt a bit frustrating... did that ease up at all?"
"it's been a few days. how are you doing?"

Return only the message text. No quotes, no explanation, no formatting.`

  try {
    const response = await callAI(
      'You are Vera. Write only the message text as instructed. Keep it to 1-2 sentences.',
      [{ role: 'user', content: prompt }],
      80
    )
    return response.trim().replace(/^["']|["']$/g, '')
  } catch (e) {
    return null
  }
}

// ─── Contextual opening (returning same-day or 1-2 days) ─────────────────────

export async function generateContextualOpening(recentContext) {
  const prompt = `\
You are Vera — a close, warm friend. The user is opening the app.

Recent context from their life:
${recentContext}

Write ONE short opening message (1 sentence) that:
- Feels like a natural continuation, not a fresh start
- May gently reference something from the context if it feels right
- Does not recap or summarise — just opens naturally
- Casual, warm, lowercase is fine
- No exclamation points, no em dashes, does not start with "I"

Examples:
"how are you doing today?"
"how did yesterday end up?"
"how's today been so far?"
"the week still feeling heavy?"

Return only the message text.`

  try {
    const response = await callAI(
      'You are Vera. Write only the message text. One sentence.',
      [{ role: 'user', content: prompt }],
      60
    )
    return response.trim().replace(/^["']|["']$/g, '')
  } catch (e) {
    return null
  }
}

// ─── Day summary (calendar recap) ────────────────────────────────────────────

export async function generateDaySummary(entries) {
  if (!entries || entries.length === 0) return null

  const conversationText = entries
    .filter(e => e.userText && e.aiResponse && e.type !== 'vera_closing')
    .map(e => `Person: ${e.userText}\nVera: ${e.aiResponse}`)
    .join('\n\n')

  if (!conversationText.trim()) return null

  const prompt = `\
Read this conversation and write a brief recap of what was shared and discussed.

${conversationText}

Write 2-3 sentences in third person that capture:
- what was on the person's mind that day
- the emotional texture of the conversation
- anything significant that came up

Write warmly and specifically — reference what actually happened, not generic observations.
This recap will be shown to the person when they look back at this day in their calendar.

Do not start with "The person..." — just describe what happened naturally.
No bullet points. No lists. Plain prose only.`

  try {
    const response = await callAI(
      'Write a warm, specific 2-3 sentence recap of this conversation.',
      [{ role: 'user', content: prompt }],
      150
    )
    return response.trim()
  } catch (e) {
    if (DEBUG()) console.warn('[Vera] Day summary generation failed:', e)
    return null
  }
}

// ─── Daily closing generation ─────────────────────────────────────────────────
// Called on app boot when yesterday's session has no closing.
// Inserts a warm, specific closing retroactively at the end of yesterday's thread.

export async function generateClosing(yesterdayMessages) {
  if (!yesterdayMessages || yesterdayMessages.length === 0) return null

  const conversationText = yesterdayMessages
    .filter(m => m.type === 'user' || m.type === 'vera')
    .map(m => `${m.type === 'user' ? 'Person' : 'Vera'}: ${m.text}`)
    .join('\n')

  if (!conversationText.trim()) return null

  const closingPrompt = PROMPTS.closing(conversationText)

  if (DEBUG()) console.log('[Vera] Generating closing for yesterday...')

  try {
    const response = await callAI(
      'You are Vera. Follow the closing instructions exactly.',
      [{ role: 'user', content: closingPrompt }],
      150
    )
    return response.trim()
  } catch (err) {
    console.warn('[Vera] Closing generation failed silently:', err)
    return null
  }
}
