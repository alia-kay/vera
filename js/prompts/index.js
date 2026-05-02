import { buildSystemPrompt } from './vera.js'
import { buildSummaryPrompt, buildFirstSummaryPrompt, buildClosingPrompt, buildWeeklyReviewPrompt } from './summary.js'
import {
  getUserProfile,
  getLivingSummary,
  getTrackedPatterns,
  getWeeklyIntention,
  getMonthlyIntention,
  getWeeklyReview,
  getWeekKey,
  getMonthKey,
} from '../lib/storage.js'

// ─── Context block ────────────────────────────────────────────────────────────

export function buildContextBlock() {
  const profile = getUserProfile()
  const summary = getLivingSummary()

  const today      = new Date()
  const weekKey    = getWeekKey(today)
  const monthKey   = getMonthKey(today)

  const weeklyIntention  = getWeeklyIntention(weekKey)
  const monthlyIntention = getMonthlyIntention(monthKey)
  const weeklyReview     = getWeeklyReview(weekKey)
  const trackedPatterns  = getTrackedPatterns()

  const contextParts = []

  if (summary?.summary) contextParts.push(summary.summary)

  if (weeklyIntention?.sentence) {
    let intentionCtx = `This week's intention: "${weeklyIntention.sentence}"`
    if (weeklyIntention.focusWords?.length > 0) {
      intentionCtx += `\nFocus: ${weeklyIntention.focusWords.join(', ')}`
    }
    const done  = (weeklyIntention.items || []).filter(i => i.checked).length
    const total = (weeklyIntention.items || []).length
    if (total > 0) intentionCtx += `\nChecklist: ${done}/${total} done`
    contextParts.push(intentionCtx)
  }

  if (monthlyIntention?.sentence) {
    contextParts.push(`This month's intention: "${monthlyIntention.sentence}"`)
  }

  if (weeklyReview?.responses?.insights?.length > 0) {
    const mw = weeklyReview.responses.moodWord ? `"${weeklyReview.responses.moodWord}" — ` : ''
    contextParts.push(`Last weekly review: ${mw}${weeklyReview.responses.insights[0]}`)
  }

  if (trackedPatterns.length > 0) {
    const top = [...trackedPatterns]
      .sort((a, b) => (b.recentCount || 0) - (a.recentCount || 0))
      .slice(0, 5)
      .map(p => `- ${p.name}: ${p.recentCount || 0}x recently`)
      .join('\n')
    contextParts.push(`Recurring patterns:\n${top}`)
  }

  const fullSummary = contextParts.length > 0 ? contextParts.join('\n\n') : null

  return buildSystemPrompt(profile, fullSummary)
}

// ─── Prompt registry ──────────────────────────────────────────────────────────

export const PROMPTS = {
  buildSystemPrompt,
  buildSummaryPrompt,
  buildFirstSummaryPrompt,
  buildContextBlock,
  closing: buildClosingPrompt,
  weeklyReview: buildWeeklyReviewPrompt,
}
