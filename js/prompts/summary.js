// ─── Living summary prompt builders ──────────────────────────────────────────

export function buildFirstSummaryPrompt(entries) {
  const entryBlock = formatEntries(entries)

  return `\
You are building a private context summary for Vera, an AI companion focused on self-awareness.
This summary will be injected into future conversations so Vera can respond with continuity.

Write a concise, structured summary (200–300 words) of this person based on their journal entries.
Include: recurring emotional patterns, physical signals they mention, themes in their life,
how they tend to frame difficulty, and anything that seems to matter deeply to them.
Write in third person. Be precise. Do not be clinical. Do not invent what isn't there.
Do not include dates or timestamps.

--- ENTRIES ---
${entryBlock}
--- END ENTRIES ---

Write the summary now:`
}

export function buildSummaryPrompt(entries, existingSummary) {
  const entryBlock = formatEntries(entries)

  return `\
You are updating a private context summary for Vera, an AI companion focused on self-awareness.
This summary is injected into future conversations for continuity.

Update the summary below to incorporate what's in the new entries.
Preserve what's still true. Update what has shifted. Remove what's no longer relevant.
Keep it 200–300 words. Third person. Precise. Not clinical.

--- EXISTING SUMMARY ---
${existingSummary}
--- END EXISTING SUMMARY ---

--- NEW ENTRIES ---
${entryBlock}
--- END NEW ENTRIES ---

Write the updated summary now:`
}

// ─── Daily closing prompt ─────────────────────────────────────────────────────
// Called the morning after a conversation to generate a warm closing.
// The closing is retroactively inserted at the end of yesterday's thread.

export function buildClosingPrompt(conversationText) {
  return `\
Read this conversation between a person and Vera (an AI companion):

${conversationText}

Write a closing message from Vera — 2 to 4 sentences.

The tone: like a friend wrapping up a phone call. Warm, specific, and personal.
Reference something real from what was said — a specific feeling, situation, or
moment that came up. Don't summarise or list things. Just acknowledge what was
present and wish them well.

Signal that the conversation is done for the day, and that you'll talk tomorrow.

Examples of the right tone:
"Okay, that's enough for today. A lot came up — the meeting, that familiar anger,
the exhaustion underneath it. Hope the evening is gentler than the day was.
Talk tomorrow."

"Alright. You named something real tonight. Sleep on it. Talk tomorrow."

"That's a lot to be carrying. The tiredness makes sense. Hope the morning is
quieter. Talk tomorrow."

Never: generic affirmations, wellness language, or summaries that list topics.
Always: specific, warm, brief, feels like a real person saying goodbye.`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEntries(entries) {
  return entries
    .map(e => {
      const lines = [`User: ${e.userText}`]
      if (e.aiResponse) lines.push(`Vera: ${e.aiResponse}`)
      return lines.join('\n')
    })
    .join('\n\n')
}
