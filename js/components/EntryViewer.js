import htm from 'https://unpkg.com/htm?module'
import { generateDaySummary } from '../lib/api.js'

const html = htm.bind(React.createElement)

const MOOD_LABELS = { 1: 'Hard', 2: 'Low', 3: 'Okay', 4: 'Good', 5: 'Clear' }

function formatEntryDate(dateStr) {
  const date  = new Date(dateStr + 'T00:00:00')
  const day   = date.toLocaleDateString('en-US', { weekday: 'long' })
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  return `${day} · ${month} ${date.getDate()}`
}

function parseRecap(text) {
  if (!text) return { main: '', suggestion: null }
  const parts = text.split('\n---\n')
  return {
    main:       parts[0]?.trim() || text,
    suggestion: parts[1]?.trim() || null,
  }
}

const recapStyle = {
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: '19px',
  fontWeight: 300,
  fontStyle: 'italic',
  color: 'var(--text)',
  lineHeight: 1.7,
}

function renderRecap(text) {
  const sentences = text.match(/[^.!?]+[.!?]+["']?\s*/g) || [text]

  if (sentences.length <= 2) {
    return html`<div style=${recapStyle}>${text}</div>`
  }

  const paragraphs = []
  for (let i = 0; i < sentences.length; i += 2) {
    paragraphs.push(sentences.slice(i, i + 2).join('').trim())
  }

  return html`
    <div style=${{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      ${paragraphs.map((p, i) => html`
        <div key=${i} style=${recapStyle}>${p}</div>
      `)}
    </div>
  `
}

export default function EntryViewer({ date, entries, onClose, recapCache, onRecapGenerated }) {
  if (!date || !entries || entries.length === 0) return null

  const regularEntries = entries.filter(e => e.type !== 'vera_closing')
  if (regularEntries.length === 0) return null

  const moodEntry = regularEntries.find(e => e.mood != null)
  const moodLabel = MOOD_LABELS[moodEntry?.mood] || ''

  const [recap,   setRecap]   = React.useState(recapCache?.[date] || null)
  const [loading, setLoading] = React.useState(!recapCache?.[date])

  React.useEffect(() => {
    if (recapCache?.[date]) {
      setRecap(recapCache[date])
      setLoading(false)
      return
    }
    setLoading(true)
    setRecap(null)
    generateDaySummary(entries).then(text => {
      setRecap(text)
      setLoading(false)
      if (text && onRecapGenerated) onRecapGenerated(date, text)
    })
  }, [date])

  const { main, suggestion } = parseRecap(recap)

  return html`
    <div>
      <div class="mv-divider mv-divider-amber">
        <div class="mv-div-line"></div>
        <div class="mv-div-diamond"></div>
        <div class="mv-div-label">${formatEntryDate(date)}</div>
        <div class="mv-div-diamond"></div>
        <div class="mv-div-line"></div>
      </div>

      <div class="entry-wrap">
        <div class="entry-date-row">
          ${moodLabel
            ? html`<div class="entry-mood-pill">${moodLabel}</div>`
            : html`<div></div>`
          }
          <div class="entry-close" onClick=${onClose}>Close ×</div>
        </div>

        ${loading && html`
          <div style=${{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '16px',
            fontStyle: 'italic',
            color: 'var(--text-dim)',
            lineHeight: 1.6,
            opacity: 0.6,
          }}>Vera is reading this day...</div>
        `}

        ${!loading && main && html`
          ${renderRecap(main)}

          ${suggestion && html`
            <div style=${{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '16px',
              fontWeight: 300,
              fontStyle: 'italic',
              color: 'var(--text-muted)',
              lineHeight: 1.65,
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '0.5px solid var(--border)',
            }}>${suggestion}</div>
          `}
        `}

        ${!loading && !main && html`
          <div style=${{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '16px',
            fontStyle: 'italic',
            color: 'var(--text-dim)',
            lineHeight: 1.6,
            opacity: 0.5,
          }}>Nothing to reflect on for this day.</div>
        `}
      </div>
    </div>
  `
}
