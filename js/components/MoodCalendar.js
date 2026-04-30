import htm from 'https://unpkg.com/htm?module'
import { getMoodForMonth, getPatternData, getTodayString } from '../lib/storage.js'

const html = htm.bind(React.createElement)

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const LEGEND_ITEMS = [
  { label: 'Hard',  bg: 'rgba(180,70,60,0.3)',   color: '#C4786A' },
  { label: 'Low',   bg: 'rgba(160,110,50,0.3)',  color: '#B8905A' },
  { label: 'Okay',  bg: 'rgba(140,130,80,0.28)', color: '#A89870' },
  { label: 'Good',  bg: 'rgba(70,130,100,0.3)',  color: '#5A9A7A' },
  { label: 'Clear', bg: 'rgba(70,140,160,0.3)',  color: '#5AAABB' },
]

const DOMAIN_COLOURS = {
  physical_pain:      'rgba(220,100,80,0.9)',
  anger_suppression:  'rgba(74,180,160,0.9)',
  sleep:              'rgba(100,130,200,0.9)',
  emotional_distress: 'rgba(140,100,170,0.9)',
  physical_tension:   'rgba(170,150,60,0.9)',
  energy_fatigue:     'rgba(90,100,130,0.9)',
  mood_low:           'rgba(80,120,160,0.9)',
  cognitive:          'rgba(140,160,100,0.9)',
  self_worth:         'rgba(180,120,80,0.9)',
  social_relational:  'rgba(100,160,140,0.9)',
  custom:             'rgba(160,160,160,0.9)',
}

function getDomainColour(domain) {
  return DOMAIN_COLOURS[domain] || 'rgba(200,200,200,0.9)'
}

function getDayClass(mood, isToday, isSelected, isFuture) {
  const classes = ['c']
  if (isFuture) { classes.push('future'); return classes.join(' ') }
  if (isToday) classes.push('today')
  else if (mood === 1) classes.push('m1')
  else if (mood === 2) classes.push('m2')
  else if (mood === 3) classes.push('m3')
  else if (mood === 4) classes.push('m4')
  else if (mood === 5) classes.push('m5')
  else classes.push('no-entry')
  if (isSelected) classes.push('selected')
  return classes.join(' ')
}

function pad(n) { return String(n).padStart(2, '0') }

export default function MoodCalendar({ year, month, selectedDate, activeFilters, onDaySelect, onPrevMonth, onNextMonth }) {
  const moodData    = getMoodForMonth(year, month)
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

  // Build occurrence lookup by date for active filters
  const monthPrefix = `${year}-${pad(month)}`
  const occurrencesByDate = {}
  if (patternData?.occurrences) {
    patternData.occurrences.forEach(occ => {
      if (occ.date?.startsWith(monthPrefix)) {
        if (!occurrencesByDate[occ.date]) occurrencesByDate[occ.date] = []
        occurrencesByDate[occ.date].push(occ.domain)
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

      <div class="cal-grid">
        ${DAY_LABELS.map((l, i) => html`<div key=${'lbl-' + i} class="day-lbl">${l}</div>`)}

        ${cells.map((day, i) => {
          if (day === null) {
            return html`<div key=${'pad-' + i} class="c empty"></div>`
          }

          const dateStr  = `${year}-${pad(month)}-${pad(day)}`
          const mood     = moodData[dateStr] ?? null
          const isToday  = dateStr === todayStr
          const isFuture = dateStr > todayStr
          const isSel    = dateStr === selectedDate
          const cls      = getDayClass(mood, isToday, isSel, isFuture)

          // Pattern dot: use colour of the last active filter with an occurrence today
          const dayDomains = occurrencesByDate[dateStr] || []
          let dotColor = null
          if (activeFilters.length > 0 && dayDomains.length > 0) {
            for (let f = activeFilters.length - 1; f >= 0; f--) {
              if (dayDomains.includes(activeFilters[f])) {
                dotColor = getDomainColour(activeFilters[f])
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

      <div class="legend">
        ${LEGEND_ITEMS.map(item => html`
          <div key=${item.label} class="leg">
            <div class="leg-dot" style=${{ background: item.bg }}></div>
            <div class="leg-lbl" style=${{ color: item.color }}>${item.label}</div>
          </div>
        `)}
      </div>
    </div>
  `
}
