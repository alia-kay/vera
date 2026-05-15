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
  getWeeklyIntention,
  getMonthlyIntention,
  getTrackedPatterns,
  getWeekKey,
  getMonthKey,
} from './storage.js'

// ─── Provider config ──────────────────────────────────────────────────────────

const AI_ENDPOINT         = 'https://api.anthropic.com/v1/messages'
const MODEL_CONVERSATION  = 'claude-sonnet-4-5-20251001'
const MODEL_BACKGROUND    = 'claude-haiku-4-5-20251001'
const _ENC_KEY       = 'vera-mv-2024-xk'
const _ENC_API_KEY   = 'BQ5fAEMZW0xCWQIHABc7QigUCkcsGRl1QQBrXRkGHQE+GWcbKVtiRWZjex0lAjA+UBkLFE5EQmR+ZzIBAwICVEIEEnlmUlh4WzkuHAkdOE4IH114AAtxfik7Li01B1wKPkxzHQN2SDBcESQz'
const AI_API_KEY     = atob(_ENC_API_KEY).split('').map((c, i) =>
  String.fromCharCode(c.charCodeAt(0) ^ _ENC_KEY.charCodeAt(i % _ENC_KEY.length))
).join('')
const MAX_TOKENS_CONVERSATION = 1000
const MAX_TOKENS_SUMMARY      = 500

const DEBUG = () => localStorage.getItem('vera_debug') === 'true'

// ─── Core API call ────────────────────────────────────────────────────────────

// Parse SSE stream, call onChunk for each text delta, return full text
async function readStream(response, onChunk) {
  const reader  = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer   = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() // keep incomplete last line in buffer

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data)
        if (
          parsed.type === 'content_block_delta' &&
          parsed.delta?.type === 'text_delta' &&
          parsed.delta?.text
        ) {
          const chunk = parsed.delta.text
          fullText += chunk
          onChunk(chunk)
        }
      } catch (e) { /* skip malformed SSE lines */ }
    }
  }

  return fullText
}

// Collect full stream without callback (for non-chat calls)
async function collectStream(response) {
  let fullText = ''
  await readStream(response, chunk => { fullText += chunk })
  return fullText
}

// onChunk(text) is called with each text fragment as it streams.
// Pass null/undefined for non-chat calls (summary, review, suggest).
export async function callAI(systemPrompt, messages, maxTokens = MAX_TOKENS_CONVERSATION, onChunk = null, model = MODEL_CONVERSATION) {
  if (!AI_API_KEY) throw new Error('No API key configured. Set AI_API_KEY in js/lib/api.js')

  if (DEBUG()) {
    console.log('AI call — model:', model, '| tokens:', maxTokens)
    console.group('[Vera] callAI')
    console.log('system:', systemPrompt)
    console.log('messages:', messages)
    console.groupEnd()
  }

  const response = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': AI_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
      stream: !!onChunk,
    }),
  })

  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText)
    throw new Error(`AI request failed (${response.status}): ${err}`)
  }

  const fullText = onChunk
    ? await readStream(response, onChunk)
    : await collectStream(response)

  if (DEBUG()) console.log('[Vera] full response:', fullText)

  return fullText
}

// ─── Response parsing ─────────────────────────────────────────────────────────

export function parseVeraResponse(rawResponse) {
  const trackMatch    = rawResponse.match(/\[TRACK:\s*(.+?)\s*\|\s*domain:\s*(.+?)\]/i)
  const doneMatch     = rawResponse.match(/\[DONE:\s*(.+?)(?:\s*\|\s*type:\s*(.+?))?(?:\s*\|\s*author:\s*(.+?))?\]/i)
  const aheadMatch    = rawResponse.match(/\[AHEAD:\s*(.+?)(?:\s*\|\s*type:\s*(.+?))?(?:\s*\|\s*author:\s*(.+?))?\]/i)
  const addMatch      = rawResponse.match(/\[ADD:\s*(.+?)(?:\s*\|\s*type:\s*(.+?))?(?:\s*\|\s*author:\s*(.+?))?\]/i)
  const removeMatch   = rawResponse.match(/\[REMOVE:\s*(.+?)\]/i)
  const nudgeDeclined = /\[NUDGE_DECLINED\]/i.test(rawResponse)
  const saveIntMatch  = rawResponse.match(/\[SAVE_INTENTION:\s*(.+?)\]/i)
  const saveRevMatch  = rawResponse.match(/\[SAVE_REVIEW:\s*(.+?)\]/i)

  const displayText = rawResponse
    .replace(/\[TRACK:.*?\]/gi, '')
    .replace(/\[DONE:.*?\]/gi, '')
    .replace(/\[AHEAD:.*?\]/gi, '')
    .replace(/\[ADD:.*?\]/gi, '')
    .replace(/\[REMOVE:.*?\]/gi, '')
    .replace(/\[NUDGE_DECLINED\]/gi, '')
    .replace(/\[SAVE_INTENTION:.*?\]/gi, '')
    .replace(/\[SAVE_REVIEW:.*?\]/gi, '')
    .trim()

  function parseTagFields(str) {
    const result = {}
    const parts  = str.split('|').map(s => s.trim())
    if (parts[0] && !parts[0].includes(':')) result.period = parts[0].trim()
    parts.forEach(part => {
      const idx = part.indexOf(':')
      if (idx > -1) {
        result[part.slice(0, idx).trim()] = part.slice(idx + 1).trim()
      }
    })
    return result
  }

  return {
    displayText,
    newPattern:    trackMatch ? { name: trackMatch[1].trim(), domain: trackMatch[2].trim().toLowerCase() } : null,
    doneItem:      doneMatch  ? { title: doneMatch[1].trim(),  type: doneMatch[2]?.trim()  || 'Book', author: doneMatch[3]?.trim()  || null } : null,
    aheadItem:     aheadMatch ? { title: aheadMatch[1].trim(), type: aheadMatch[2]?.trim() || 'Book', author: aheadMatch[3]?.trim() || null } : null,
    newListItem:   addMatch   ? { title: addMatch[1].trim(),   type: addMatch[2]?.trim()   || 'Other', author: addMatch[3]?.trim() || null } : null,
    removeTitle:   removeMatch ? removeMatch[1].trim() : null,
    nudgeDeclined,
    saveIntention: saveIntMatch ? parseTagFields(saveIntMatch[1]) : null,
    saveReview:    saveRevMatch ? parseTagFields(saveRevMatch[1]) : null,
  }
}

// ─── Send message ─────────────────────────────────────────────────────────────

export async function sendMessage(userText, allMessages = [], activeNudge = null, onChunk = null) {
  // Filter to today's conversation only — gives Vera full memory of today's thread
  const todayStr = getTodayString()
  let todayStartIdx = 0
  allMessages.forEach((m, i) => {
    if (m.type === 'separator' && m.date === todayStr) todayStartIdx = i + 1
  })
  const todayMessages = allMessages.slice(todayStartIdx)

  // Compute signals and build final system prompt
  const signals      = computeSignals(todayMessages)
  const signalsBlock = formatSignals(signals, activeNudge)
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

  const rawResponse = await callAI(systemPrompt, historyMessages, MAX_TOKENS_CONVERSATION, onChunk, MODEL_CONVERSATION)
  const result = parseVeraResponse(rawResponse)

  if (result.newPattern) {
    addCustomPattern(result.newPattern.name, result.newPattern.domain)
    if (DEBUG()) console.log('[Vera] new pattern tracked:', result.newPattern)
  }

  return result
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
    MAX_TOKENS_SUMMARY,
    null,
    MODEL_BACKGROUND
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
      400,
      null,
      MODEL_BACKGROUND
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

// ─── Period insights pre-generation ──────────────────────────────────────────
// Called on app boot (not from review flow). Generates insights from conversation
// data and stores them so they appear when user opens the review card.

export async function generatePeriodInsights(entries, intention, isMonthly = false) {
  if (!entries || entries.length === 0) return null

  const period = isMonthly ? 'month' : 'week'

  const conversationText = entries
    .filter(e => e.userText)
    .map(e => `Person: ${e.userText}`)
    .join('\n')

  if (!conversationText.trim()) return null

  const intentionContext = intention?.sentence
    ? `Their ${period}ly intention was: "${intention.sentence}"${
        intention.focusWords?.length
          ? ` (focus: ${intention.focusWords.join(', ')})`
          : ''
      }${
        intention.items?.length
          ? `\nChecklist: ${intention.items.map(i =>
              `${i.checked ? '✓' : '○'} ${i.text}`
            ).join(', ')}`
          : ''
      }`
    : `No ${period}ly intention was set.`

  const prompt = `\
You are Vera. Read what this person shared during the past ${period}.

${intentionContext}

What they shared:
${conversationText}

Generate exactly 3 insights based on what you observed in their conversations.
Not what they told you in a review — what actually came through this ${period}.

1. Intention insight — how conversations connected to their intention,
   or what theme emerged if no intention was set
2. Texture — the emotional shape of the ${period} in one sentence.
   What was it like to be them this ${period}? Specific, not generic.
3. Thread — one thing worth carrying forward: a question, a direction,
   or a pattern that kept coming up

Rules:
- Each insight: one sentence maximum
- Specific — reference what actually came up
- Vera's voice: warm, perceptive, direct. No therapy language.
- Never say "worth sitting with"
- Never generic: "You had a challenging ${period}"

Return JSON:
{
  "insights": ["insight 1", "insight 2", "insight 3"],
  "moodWord": "2-4 word phrase capturing the emotional texture"
}

Return only valid JSON. No preamble, no markdown fences.`

  try {
    const raw   = await callAI(
      'You are Vera. Return only valid JSON as instructed.',
      [{ role: 'user', content: prompt }],
      300,
      null,
      MODEL_BACKGROUND
    )
    const clean = raw.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch(e) {
    console.warn('generatePeriodInsights failed:', e)
    return null
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
You are Vera — a close friend. The user hasn't opened the app in ${daysInactive} days.

Here is what they last talked about:
${recentContext}

Write ONE short opening message (1 sentence, 2 at most).

Rules:
- Sound like a real person texting. Not composed. Not literary.
- If referencing what they last shared: name something SPECIFIC they said,
  not the category or label of the topic.
  BAD: "how's the stress and anxiety stuff been treating you?"
  BAD: "how's that work situation going?"
  GOOD: "did that meeting end up happening?"
  GOOD: "how did that conversation go?"
  GOOD: "still thinking about that thing with your manager?"
- If there's nothing specific worth referencing, just open simply:
  "hey. how are you doing?"
  "hey — what's been going on?"
  "how've you been?"
- No slang ("been a minute", "long time no see", "stranger")
- No em dashes
- No exclamation points
- Does not start with "I"
- Lowercase is fine
- No therapy language, no labels for emotional states

Return only the message text. No quotes, no explanation.`

  try {
    const response = await callAI(
      'You are Vera. Write only the message text as instructed. Keep it to 1-2 sentences.',
      [{ role: 'user', content: prompt }],
      80,
      null,
      MODEL_CONVERSATION
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
      60,
      null,
      MODEL_CONVERSATION
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
    .filter(e => e.userText && e.type !== 'vera_closing')
    .map(e => e.userText)
    .join('\n\n')

  if (!conversationText.trim()) return null

  const prompt = `\
Read what this person shared today and write a brief day recap.

${conversationText}

Write in second person ("you", not "they" or "the person").
2-3 sentences maximum. Make it slightly philosophical — not just a summary of events,
but a reflection on what the day held. Name the emotional texture, not just the facts.

Then on a new line after "---", write ONE short reflection suggestion.
This is an invitation to think further — a question or a gentle prompt.
It should feel like something worth sitting with, not a therapy exercise.

Format:
[2-3 sentence recap]
---
[one reflection suggestion]

Example:
"Today held a lot of invisible weight — the kind that builds in silence and only shows up when you stop moving. Something about being unseen in a room full of people seems to be sitting with you."
---
"What would it have felt like to say one true thing in that meeting?"

Keep it warm, specific, and human. No clinical language. No bullet points.`

  try {
    const response = await callAI(
      'Write a warm, philosophical 2-3 sentence day recap followed by one reflection suggestion.',
      [{ role: 'user', content: prompt }],
      200,
      null,
      MODEL_BACKGROUND
    )
    return response.trim()
  } catch (e) {
    if (DEBUG()) console.warn('[Vera] Day summary generation failed:', e)
    return null
  }
}

// ─── Grow suggestion generation ──────────────────────────────────────────────

export async function generateGrowSuggestion(listItems = [], recentEntries = []) {
  const profile          = getUserProfile()
  const today            = new Date()
  const weekKey          = getWeekKey(today)
  const monthKey         = getMonthKey(today)
  const weeklyIntention  = getWeeklyIntention(weekKey)
  const monthlyIntention = getMonthlyIntention(monthKey)
  const trackedPatterns  = getTrackedPatterns()
  const alreadyInList    = listItems.map(i => i.title).join(', ')

  let contextSignal = ''
  let signalType    = 'general'

  // Priority 1: Active intentions mentioning learning/reading/watching
  const intentionText = [weeklyIntention?.sentence, monthlyIntention?.sentence]
    .filter(Boolean).join(' ')
  if (intentionText && /read|book|learn|study|watch|listen|podcast|film|understand|explore/i.test(intentionText)) {
    contextSignal = `Their current intention: "${intentionText}"`
    signalType = 'intention'
  }

  // Priority 2: Strong patterns (3+ recent occurrences)
  if (!contextSignal && trackedPatterns.length > 0) {
    const strongPattern = trackedPatterns
      .sort((a, b) => (b.recentCount || 0) - (a.recentCount || 0))
      .find(p => (p.recentCount || 0) >= 3)
    if (strongPattern) {
      contextSignal = `A recurring pattern in their life: "${strongPattern.name}" (${strongPattern.recentCount} times recently)`
      signalType = 'pattern'
    }
  }

  // Priority 3: Recent conversation context
  if (!contextSignal && recentEntries.length >= 3) {
    contextSignal = `Recent conversations:\n${recentEntries
      .slice(0, 4).map(e => e.userText.slice(0, 120)).join('\n')}`
    signalType = 'conversation'
  }

  // Priority 4: Onboarding profile fallback
  if (!contextSignal) {
    const focusStr    = profile?.focusAreas?.join(', ') || ''
    const interestStr = profile?.dayOneContext?.slice(0, 200) || ''
    if (focusStr || interestStr) {
      contextSignal = `What this person cares about: ${[focusStr, interestStr].filter(Boolean).join(' — ')}`
      signalType = 'profile'
    }
  }

  const reasonGuidance = signalType === 'general'
    ? `reason: Return null — no specific context to draw from.`
    : `reason: 2-3 short sentences maximum. Lead with what the content is actually about. Then optionally one brief note on why it connects to this person. Each sentence must be short — under 20 words. Return null if context is too thin.`

  const prompt = `\
Suggest ONE book, film, podcast, or article for this person.

${contextSignal || 'No specific context — suggest something broadly valuable.'}

Already in their list (do not suggest these):
${alreadyInList || '(nothing yet)'}

Return JSON:
{
  "title": "exact title",
  "author": "author, host, director, or publication",
  "type": "Book" | "Film" | "Podcast" | "Article" | "Other",
  "reason": "..."
}

For the reason field: lead with what the content IS about — its core ideas, themes,
or what makes it interesting. Then briefly why it might resonate for this person.
More weight on the content itself, less on the recommendation rationale.
${reasonGuidance}

Return only valid JSON. No preamble, no markdown fences.`

  try {
    const raw = await callAI(
      'You are Vera. Return only valid JSON.',
      [{ role: 'user', content: prompt }],
      220,
      null,
      MODEL_BACKGROUND
    )
    const clean = raw.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)
    result.generatedAt = new Date().toISOString()
    return result
  } catch(e) {
    console.warn('Grow suggestion failed:', e)
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
      100,
      null,
      MODEL_BACKGROUND
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
      150,
      null,
      MODEL_BACKGROUND
    )
    return response.trim()
  } catch (err) {
    console.warn('[Vera] Closing generation failed silently:', err)
    return null
  }
}
