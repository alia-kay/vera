import htm from 'https://unpkg.com/htm?module'

const html = htm.bind(React.createElement)

const MOOD_LABELS = { 1: 'Hard', 2: 'Low', 3: 'Okay', 4: 'Good', 5: 'Clear' }

function getMoodLabel(mood) {
  return MOOD_LABELS[mood] || ''
}

function formatEntryDate(dateStr) {
  const date  = new Date(dateStr + 'T00:00:00')
  const day   = date.toLocaleDateString('en-US', { weekday: 'long' })
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  return `${day} · ${month} ${date.getDate()}`
}

export default function EntryViewer({ date, entries, onClose }) {
  if (!date || !entries || entries.length === 0) return null

  const regularEntries = entries.filter(e => e.type !== 'vera_closing')
  if (regularEntries.length === 0) return null

  const moodEntry = regularEntries.find(e => e.mood != null)
  const moodLabel = getMoodLabel(moodEntry?.mood)

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

        ${regularEntries.map(entry => html`
          <div key=${entry.id} class="exchange">
            ${entry.aiResponse && html`
              <div class="ex-vera">Vera — "${entry.aiResponse}"</div>
            `}
            ${entry.userText && html`
              <div class="ex-user">${entry.userText}</div>
            `}
          </div>
        `)}
      </div>
    </div>
  `
}
