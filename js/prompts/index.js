import { buildSystemPrompt } from './vera.js'
import { buildSummaryPrompt, buildFirstSummaryPrompt, buildClosingPrompt } from './summary.js'
import { getUserProfile, getLivingSummary } from '../lib/storage.js'

// ─── Context block ────────────────────────────────────────────────────────────

export function buildContextBlock() {
  const profile = getUserProfile()
  const summary = getLivingSummary()
  return buildSystemPrompt(profile, summary?.summary ?? null)
}

// ─── Prompt registry ──────────────────────────────────────────────────────────

export const PROMPTS = {
  buildSystemPrompt,
  buildSummaryPrompt,
  buildFirstSummaryPrompt,
  buildContextBlock,
  closing: buildClosingPrompt,
}
