import htm from 'https://unpkg.com/htm?module'
import { getMoodForMonth, getPatternData, getTodayString, getEntriesForDate } from '../lib/storage.js'
import PatternChips, { getPatternColour } from './PatternChips.js'

const html = htm.bind(React.createElement)

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function getDayClass(dateStr, isToday, isSelected, isFuture) {
  const classes = ['c']
  if (isFuture) { classes.push('future'); return classes.join(' ') }
  if (isToday) {
    classes.push('today')
  } else {
    const hasEntry = getEntriesForDate(dateStr).length > 0
    classes.push(hasEntry ? 'has-entry' : 'no-entry')
  }
  if (isSelected) classes.push('selected')
  return classes.join(' ')
}

function pad(n) { return String(n).padStart(2, '0') }

export default function MoodCalendar({
  year, month, selectedDate, activeFilters,
  onDaySelect, onPrevMonth, onNextMonth,
  patterns, onToggle, onDelete,
}) {
  const patternData = getPatternData()
  const todayStr    = getTodayString()

  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const nextAllowed    = !isCurrentMonth

  // Calendar grid — Monday-first
  const daysInMonth = new Date(year, month, 0).getDate()
  const jsFirstDay  = new Date(year, month - 1, 1).getDay()  // 0=Sun
  const startPad    = (jsFirstDay + 6) % 7                   // Mon=0 … Sun=6

  const cells = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  // Build per-pattern colour map (index → colour)
  const patternColourMap = {}
  ;(patterns || []).forEach((p, i) => {
    patternColourMap[p.id] = getPatternColour(i)
  })

  // Build occurrence lookup: date → Set of domains present
  const monthPrefix = `${year}-${pad(month)}`
  const occurrencesByDate = {}
  if (patternData?.occurrences) {
    patternData.occurrences.forEach(occ => {
      if (occ.date?.startsWith(monthPrefix)) {
        if (!occurrencesByDate[occ.date]) occurrencesByDate[occ.date] = []
        occurrencesByDate[occ.date].push({ domain: occ.domain, keyword: occ.keyword })
      }
    })
  }

  return html`
    <div class="calendar-wrap">

      <div class="cal-header">
        <div class="cal-month">${MONTH_NAMES[month - 1]} ${year}</div>
        <div class="cal-nav">
          <div class="cal-arrow" onClick=${onPrevMonth}>←</div>
          <div
            class="cal-arrow"
            style=${{ opacity: nextAllowed ? 1 : 0.3, cursor: nextAllowed ? 'pointer' : 'default' }}
            onClick=${nextAllowed ? onNextMonth : undefined}
          >→</div>
        </div>
      </div>

      <${PatternChips}
        patterns=${patterns || []}
        activeFilters=${activeFilters}
        onToggle=${onToggle}
        onDelete=${onDelete}
      />

      <div class="cal-grid">
        ${DAY_LABELS.map((l, i) => html`<div key=${'lbl-' + i} class="day-lbl">${l}</div>`)}

        ${cells.map((day, i) => {
          if (day === null) {
            return html`<div key=${'pad-' + i} class="c empty"></div>`
          }

          const dateStr  = `${year}-${pad(month)}-${pad(day)}`
          const isToday  = dateStr === todayStr
          const isFuture = dateStr > todayStr
          const isSel    = dateStr === selectedDate
          const cls      = getDayClass(dateStr, isToday, isSel, isFuture)

          // Pattern dot: find the first active pattern with an occurrence on this date
          const dayOccs = occurrencesByDate[dateStr] || []
          let dotColor = null
          if (activeFilters.length > 0 && dayOccs.length > 0) {
            const activePatterns = (patterns || []).filter(p => activeFilters.includes(p.id))
            for (const p of activePatterns) {
              const match = dayOccs.some(
                o => o.domain === p.domain || o.keyword === p.name.toLowerCase()
              )
              if (match) {
                dotColor = patternColourMap[p.id]
                break
              }
            }
          }

          return html`
            <div
              key=${dateStr}
              class=${cls}
              onClick=${() => !isFuture && onDaySelect(dateStr)}
            >
              ${day}
              ${dotColor && html`<div class="pat-dot" style=${{ background: dotColor }}></div>`}
            </div>
          `
        })}
      </div>

    </div>
  `
}
