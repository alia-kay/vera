import { buildContextBlock, PROMPTS } from '../prompts/index.js'
import { computeSignals, formatSignals } from './signals.js'
import {
  getLivingSummary,
  saveLivingSummary,
  getRecentEntries,
  addCustomPattern,
  getTodayString,
  addToList,
  markListItemDone,
  getGrowItems,
  getUserProfile,
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
  const trackMatch = rawResponse.match(/\[TRACK:\s*(.+?)\s*\|\s*domain:\s*(.+?)\]/i)
  const doneMatch  = rawResponse.match(/\[DONE:\s*(.+?)\]/i)
  const addMatch   = rawResponse.match(/\[ADD:\s*(.+?)(?:\s*\|\s*type:\s*(.+?))?(?:\s*\|\s*author:\s*(.+?))?\]/i)

  const displayText = rawResponse
    .replace(/\[TRACK:.*?\]/gi, '')
    .replace(/\[DONE:.*?\]/gi, '')
    .replace(/\[ADD:.*?\]/gi, '')
    .trim()

  const newPattern = trackMatch
    ? { name: trackMatch[1].trim(), domain: trackMatch[2].trim().toLowerCase() }
    : null

  const doneTitle = doneMatch ? doneMatch[1].trim() : null

  const newListItem = addMatch ? {
    title:  addMatch[1].trim(),
    type:   addMatch[2]?.trim() || 'Other',
    author: addMatch[3]?.trim() || null,
  } : null

  return { displayText, newPattern, doneTitle, newListItem }
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
  const { displayText, newPattern, doneTitle, newListItem } = parseVeraResponse(rawResponse)

  if (newPattern) {
    addCustomPattern(newPattern.name, newPattern.domain)
    if (DEBUG()) console.log('[Vera] new pattern tracked:', newPattern)
  }

  return { displayText, newPattern, doneTitle, newListItem }
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

// ─── Grow suggestion generation ──────────────────────────────────────────────

export async function generateGrowSuggestion(listItems = [], recentEntries = []) {
  const hasContext = recentEntries.length >= 3

  const recentContext = recentEntries
    .slice(0, 5)
    .map(e => e.userText.slice(0, 120))
    .join('\n')

  const profile = getUserProfile()
  const profileContext = [
    profile.focusAreas?.length ? `Focus areas: ${profile.focusAreas.join(', ')}` : '',
    profile.dayOneContext ? `About them: ${profile.dayOneContext.slice(0, 200)}` : '',
  ].filter(Boolean).join('\n')

  const alreadyInList = listItems.map(i => i.title).join(', ')

  const contextSection = hasContext
    ? `Recent conversations:\n${recentContext}`
    : profileContext
      ? `About this person (no conversation history yet):\n${profileContext}`
      : ''

  const prompt = `\
Based on what you know about this person, suggest ONE book, film, podcast, or article they might find meaningful.

${contextSection || '(no context available yet)'}

Already in their list (do not suggest these):
${alreadyInList || '(nothing yet)'}

Return a JSON object:
{
  "title": "exact title",
  "author": "author, host, director, or publication — whoever made it",
  "type": "Book" | "Film" | "Podcast" | "Article" | "Other",
  "reason": "one sentence in Vera's voice explaining why this feels right for them right now, or null if there is not enough context to write a specific reason"
}

${hasContext ? 'The reason must be specific to what they\'ve been sharing — not generic. Sound like a friend who\'s been paying attention.' : 'If using only profile data, write a reason based on their interests. If there is no meaningful context, set reason to null.'}
Vera's voice: warm, direct, slightly imperfect. No exclamation points. No em dashes.

Return only valid JSON. No preamble, no markdown fences.`

  try {
    const raw = await callAI(
      'You are Vera. Return only valid JSON as instructed.',
      [{ role: 'user', content: prompt }],
      200
    )
    const clean = raw.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)
    result.generatedAt = new Date().toISOString()
    return result
  } catch(e) {
    console.warn('Grow suggestion generation failed:', e)
    return null
  }
}

// ─── Grow notice generation ───────────────────────────────────────────────────

export async function generateGrowNotice(listItems = [], recentEntries = []) {
  const recentContext = recentEntries
    .slice(0, 8)
    .map(e => e.userText.slice(0, 150))
    .join('\n')

  const listContext = listItems
    .map(i => `${i.title}${i.author ? ' by ' + i.author : ''} (${i.type}) — ${i.status}`)
    .join('\n')

  const prompt = `\
You are Vera. Read this person's recent conversations and their reading/watching list.
Write ONE short observation — something you've genuinely noticed across what they've been engaging with.

Recent conversations:
${recentContext || '(no recent entries)'}

Their list:
${listContext || '(nothing in list yet)'}

Rules:
- One sentence or two at most
- It should be a genuine observation — something that connects dots they haven't connected
- It can be about any topic: intellectual themes, emotional patterns, recurring interests, contradictions
- It should feel like a perceptive friend noticing something, not an algorithm summarising data
- Vera's voice: warm, specific, slightly surprising. No exclamation points. No em dashes.
- Do NOT start with "I noticed" or "I see" — start with the observation itself

Good examples:
"You keep returning to the idea of slowness — in what you read, in what you say you want."
"Almost everything in your list is about how systems fail people. That's worth sitting with."
"Six weeks of strategy reading, but every capture you write is about people, not processes."
"You've been drawn to stories about people starting over. Something brewing there?"

Return only the observation text. No quotes, no JSON, no explanation.`

  try {
    const response = await callAI(
      'You are Vera. Write only the observation text as instructed.',
      [{ role: 'user', content: prompt }],
      100
    )
    return response.trim().replace(/^["']|["']$/g, '')
  } catch(e) {
    console.warn('Grow notice generation failed:', e)
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
