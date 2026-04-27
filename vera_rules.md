# Vera · Engineering Rules

These rules apply to every Claude Code session on this project without exception.
Read this file before writing any code. Do not proceed if any rule is unclear.

---

## 1. File reading order

Before writing any code in any session:
1. Read `vera_design.md` — visual identity, colours, fonts, component patterns
2. Read `vera_rules.md` — this file — engineering rules and architectural constraints
3. Read any files relevant to the current step

---

## 2. Storage rules

- `js/lib/storage.js` is the ONLY file that reads from or writes to localStorage
- No other file may call `localStorage.getItem`, `localStorage.setItem`,
  `localStorage.removeItem`, or `localStorage.clear` directly
- All data access goes through named exported functions from storage.js
- All storage functions must use try/catch — localStorage can throw in
  private browsing or when storage is full

---

## 3. Schema migration rules

- Every data model change requires two things:
  A. Increment `CURRENT_SCHEMA_VERSION` in `js/lib/migrations.js`
  B. Write a migration function for the new version
- Migration functions must be safe on partial or missing data
- Always use `|| defaultValue` for fields that may not exist
- Never assume data exists — handle fresh installs and mid-migration states
- Purely additive changes (new top-level key with safe default) may skip
  the migration function but must still increment the version
- Structural changes (rename, restructure, type change) always require
  a migration function

---

## 4. CSS and styling rules

- All colours must use CSS variables from :root — never hardcode hex values
  outside SVG stroke/fill attributes
- CSS variables are defined in :root in index.html and match vera_design.md exactly
- No inline styles except where unavoidable (dynamic values, SVG attributes)
- No Tailwind utility classes — this project uses pure CSS
- Font sizes inside input elements must be minimum 16px to prevent iOS auto-zoom
- All touch targets must be minimum 44×44px

---

## 5. Component and layout rules

- Max content width: 390px, centered on desktop
- Use 100dvh not 100vh (accounts for mobile browser chrome)
- Header: fixed, 56px height, z-index 10
- Bottom nav: fixed, z-index 10
- Scrollable areas: always hide scrollbar on all browsers
  (-ms-overflow-style: none, scrollbar-width: none, ::-webkit-scrollbar display none)
- Safe area: nav padding-bottom uses env(safe-area-inset-bottom, 0px)
- Side padding: 24px throughout

---

## 6. Design rules (enforced in code)

- No card borders as primary layout elements — elements float on dark background
- No box shadows
- No rounded-corner containers with visible borders as primary structure
- Section dividers follow the MV diamond pattern from vera_design.md exactly
- All SVG icons use stroke-linecap: square — never round or butt
- Send button is icon-only — no mixed icon + text label buttons
- Mood selection uses the five emoji scale: 🌑 🌘 🌗 🌕 ✨
- No Lorem Ipsum — all placeholder content uses realistic app-appropriate copy
  written in Vera's voice

---

## 7. AI and API rules

- The AI provider, SDK, and model string will be decided and specified in the step
  that connects the AI — do not hardcode any provider name, company name, model
  string, or SDK import in any step before that
- Never expose API keys in client-side code for production
  (acceptable for local development only)
- The living summary is the AI's memory — never send raw entry history
  to the AI, always send the summary + last 3 entries
- max_tokens guidance: 1000 for conversation responses, 500 for summary generation
  (apply when AI is connected)
- Two separate call types will exist when AI is connected:
  A. Conversation call — generates Vera's response to user input
  B. Summary/grow call — generates living summary updates and recommendations
  Never mix these two call types
- All AI calls must be wrapped in try/catch with graceful fallback
  so the app never crashes if the AI call fails

---

## 8. Content and voice rules

- Vera speaks in Cormorant Garamond italic — always
- Vera's voice: warm, direct, curious, never clinical
- Never use therapy language: "I hear you", "that sounds difficult",
  "unpack", "sit with", "validate", "it seems like"
- Never use hollow affirmations: "that's great", "amazing", "you've got this"
- Vera asks exactly ONE follow-up question — never more
- Responses are 2–4 sentences maximum then one question
- Section divider labels are in Cinzel, uppercase, concise
- Dates display as: "Mon · Apr 25" (abbreviated day, abbreviated month, date)

---

## 9. Development conventions

- Single index.html file — all JS is modular but served without a build step
- Module files live in js/lib/ — one responsibility per file
- All module functions are named exports — no default exports
- generateId() from storage.js is the only source of unique IDs
- getTodayString() from storage.js is the only source of today's date string
  (never use new Date().toISOString().split('T')[0] directly in components)
- Console.log statements are acceptable during development
  but must be wrapped: if (window.VERA_DEBUG) console.log(...)

---

## 10. What to do when a rule conflicts with a requirement

If a new feature requirement seems to conflict with any rule in this document,
stop and flag the conflict explicitly before writing any code.
Do not silently work around a rule.
Rules can be updated — but only deliberately, with the conflict noted.

---

## 11. Conversation state rules

- Conversation state (messages array) must persist across tab switches
- The Share tab must never re-initialise or re-greet if messages already exist
- The opening prompt is shown exactly once per session — on first load if no
  messages exist for today yet, or if the user is returning on a new day
- Conversation state lives in App and is passed down to Share.js as props
  so it survives tab unmounting and remounting
- initialiseConversation() runs once on app mount (after onboarding), never again
