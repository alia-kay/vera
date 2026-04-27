# Vera Prompts

All prompt construction lives here. The API layer (`js/lib/api.js`) calls these
builders — it never holds prompt text directly.

## Files

- **vera.js** — Vera's system personality: identity, tone, rules, emotional/physical
  awareness, tracking requests. Exports `buildSystemPrompt(profile, summary)`.
- **summary.js** — Prompts for generating and regenerating the living summary.
  Exports `buildSummaryPrompt(entries, existing)` and `buildFirstSummaryPrompt(entries)`.
- **index.js** — Context assembly. Exports `buildContextBlock(profile, summary)`
  and the `PROMPTS` registry.

## Tracking tags

Vera can embed a tracking tag in her response when she notices a new pattern worth
watching. Format: `[TRACK: pattern name | domain: domain_name]`

The tag is stripped before display. `parseVeraResponse()` in `api.js` extracts it.

## Tuning

Edit prompt text here without touching API logic. The `buildSystemPrompt()` function
composes sections in order — add, remove, or reorder sections by editing `vera.js`.
