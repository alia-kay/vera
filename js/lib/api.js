import { buildContextBlock, PROMPTS } from '../prompts/index.js'
import {
  getUserProfile,
  getLivingSummary,
  saveLivingSummary,
  getRecentEntries,
  addCustomPattern,
} from './storage.js'

// ─── Provider config ──────────────────────────────────────────────────────────

const AI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
const AI_MODEL    = 'gemini-2.5-flash'
const AI_API_KEY  = 'AIzaSyBIkKxo4yu9tN3MaoUdybTKzu-Pg21KZGc' 
const MAX_TOKENS_CONVERSATION = 1000
const MAX_TOKENS_SUMMARY      = 500

const DEBUG = () => localStorage.getItem('vera_debug') === 'true'

// ─── Core API call ────────────────────────────────────────────────────────────

async function callAI(systemPrompt, userMessage, maxTokens = MAX_TOKENS_CONVERSATION) {
  if (!AI_API_KEY) throw new Error('No API key configured. Set AI_API_KEY in js/lib/api.js')

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8 },
  }

  if (DEBUG()) {
    console.group('[Vera] callAI')
    console.log('system:', systemPrompt)
    console.log('user:', userMessage)
    console.groupEnd()
  }

  const res = await fetch(`${AI_ENDPOINT}?key=${AI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`AI request failed (${res.status}): ${err}`)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text

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

export async function sendMessage(userText) {
  const systemPrompt = buildContextBlock()
  const rawResponse  = await callAI(systemPrompt, userText)
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

  const newText = await callAI(prompt, 'Generate the summary now.', MAX_TOKENS_SUMMARY)

  saveLivingSummary(newText)

  if (DEBUG()) console.log('[Vera] summary regenerated:', newText)
}
