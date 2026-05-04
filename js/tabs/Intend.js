import htm from 'https://unpkg.com/htm?module'
import {
  getWeekKey,
  getEntriesForDate,
  getWeeklyIntention,
  getMonthlyIntention,
  getWeeklyReview,
  getMonthlyReview,
} from '../lib/storage.js'
import WeekCard from '../components/WeekCard.js'

const html = htm.bind(React.createElement)

// ─── ISO week date helpers ────────────────────────────────────────────────────

function getWeekDates(weekKey) {
  const [year, week] = weekKey.split('-').map(Number)

  const jan4 = new Date(year, 0, 4)
  const dayOfWeek = jan4.getDay() || 7
  const mondayWeek1 = new Date(jan4)
  mondayWeek1.setDate(jan4.getDate() - (dayOfWeek - 1))

  const monday = new Date(mondayWeek1)
  monday.setDate(mondayWeek1.getDate() + (week - 1) * 7)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    startDate: monday.toISOString().split('T')[0],
    endDate:   sunday.toISOString().split('T')[0],
  }
}

function getWeekKeyForDate(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(
    ((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7
  )
  return `${d.getFullYear()}-${String(weekNum).padStart(2, '0')}`
}

function formatWeekLabel(startDateStr, endDateStr) {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const start  = new Date(startDateStr + 'T00:00:00')
  const end    = new Date(endDateStr   + 'T00:00:00')
  const sm = MONTHS[start.getMonth()]
  const em = MONTHS[end.getMonth()]
  if (start.getMonth() === end.getMonth()) {
    return `${sm} ${start.getDate()} – ${end.getDate()}`
  }
  return `${sm} ${start.getDate()} – ${em} ${end.getDate()}`
}

function getWeeksForMonth(year, month) {
  const weeks = []
  const seen  = new Set()
  const date  = new Date(year, month - 1, 1)

  while (date.getMonth() === month - 1) {
    const weekKey = getWeekKeyForDate(date)
    if (!seen.has(weekKey)) {
      seen.add(weekKey)
      const { startDate, endDate } = getWeekDates(weekKey)
      weeks.push({
        periodKey:  weekKey,
        periodType: 'week',
        startDate,
        endDate,
        label: formatWeekLabel(startDate, endDate),
      })
    }
    date.setDate(date.getDate() + 1)
  }

  return weeks
}

const MONTH_NAMES_FULL = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function makeMonthPeriod(year, month) {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  const firstDay = new Date(year, month - 1, 1)
  const lastDay  = new Date(year, month, 0)
  return {
    periodKey:  monthKey,
    periodType: 'month',
    startDate:  firstDay.toISOString().split('T')[0],
    endDate:    lastDay.toISOString().split('T')[0],
    label:      `${MONTH_NAMES_FULL[month - 1]} ${year}`,
  }
}

function getMonthsToShow(displayYear, displayMonth) {
  const months = []

  // Show current (display) month always
  months.push(makeMonthPeriod(displayYear, displayMonth))

  // Show 2 future months
  for (let i = 1; i <= 2; i++) {
    let m = displayMonth + i
    let y = displayYear
    if (m > 12) { m -= 12; y++ }
    months.push(makeMonthPeriod(y, m))
  }

  // Show past months ONLY if they have an intention set
  const pastMonths = []
  for (let i = 1; i <= 6; i++) {
    let m = displayMonth - i
    let y = displayYear
    if (m < 1) { m += 12; y-- }
    const monthKey = `${y}-${String(m).padStart(2, '0')}`
    const intention = getMonthlyIntention(monthKey)
    if (intention?.sentence) {
      pastMonths.unshift(makeMonthPeriod(y, m))
    }
  }

  return [...pastMonths, ...months]
}

function isThisPeriod(startDate, endDate, periodType, periodKey) {
  const todayStr = new Date().toISOString().split('T')[0]
  if (periodType === 'week') return todayStr >= startDate && todayStr <= endDate
  const [year, month] = periodKey.split('-').map(Number)
  const now = new Date()
  return now.getFullYear() === year && (now.getMonth() + 1) === month
}

function getReviewStatusFor(periodKey, periodType, endDate) {
  const review = periodType === 'week' ? getWeeklyReview(periodKey) : getMonthlyReview(periodKey)
  if (review) return 'done'
  const todayStr = new Date().toISOString().split('T')[0]
  return todayStr > endDate ? 'pending' : 'not-yet'
}

// ─── Month label for controls row ────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

// ─── IntendTab ────────────────────────────────────────────────────────────────

export default function IntendTab() {
  const today = new Date()

  const [view,             setView]             = React.useState('intentions')
  const [period,           setPeriod]           = React.useState('weeks')
  const [displayYear,      setDisplayYear]      = React.useState(today.getFullYear())
  const [displayMonth,     setDisplayMonth]     = React.useState(today.getMonth() + 1)
  const [expandedKey,      setExpandedKey]      = React.useState(() => getWeekKeyForDate(new Date()))
  const [reviewingWeekKey, setReviewingWeekKey] = React.useState(null)

  const nowYear  = today.getFullYear()
  const nowMonth = today.getMonth() + 1

  // ─── Navigation ────────────────────────────────────────────────────────────

  function handlePrevMonth() {
    if (period === 'months') {
      setDisplayYear(y => y - 1)
    } else {
      if (displayMonth === 1) {
        setDisplayYear(y => y - 1)
        setDisplayMonth(12)
      } else {
        setDisplayMonth(m => m - 1)
      }
    }
    setExpandedKey(null)
  }

  function handleNextMonth() {
    if (period === 'months') {
      if (displayYear >= nowYear) return
      setDisplayYear(y => y + 1)
    } else {
      if (displayYear === nowYear && displayMonth === nowMonth) return
      if (displayMonth === 12) {
        setDisplayYear(y => y + 1)
        setDisplayMonth(1)
      } else {
        setDisplayMonth(m => m + 1)
      }
    }
    setExpandedKey(null)
  }

  const canGoNext = period === 'months'
    ? displayYear < nowYear
    : !(displayYear === nowYear && displayMonth === nowMonth)

  const controlLabel = period === 'months'
    ? String(displayYear)
    : `${MONTH_NAMES[displayMonth - 1]} ${displayYear}`

  // ─── Period list ────────────────────────────────────────────────────────────

  const periods = period === 'weeks'
    ? getWeeksForMonth(displayYear, displayMonth)
    : getMonthsToShow(displayYear, displayMonth)

  // ─── Card toggle ────────────────────────────────────────────────────────────

  function handleToggle(key) {
    setExpandedKey(prev => prev === key ? null : key)
    // If collapsing the card that's being reviewed, clear the review form
    if (reviewingWeekKey === key) setReviewingWeekKey(null)
  }

  // ─── "Review this week" — from intentions card ─────────────────────────────

  function handleReviewThisWeek(weekKey, endDate) {
    setView('reviews')
    setExpandedKey(weekKey)
    const status = getReviewStatusFor(weekKey, 'week', endDate)
    if (status === 'pending') {
      setReviewingWeekKey(weekKey)
    }
  }

  // ─── "Begin review" — tapped directly on pending review card ───────────────

  function handleStartReview(periodKey) {
    setReviewingWeekKey(periodKey)
  }

  function handleReviewComplete(periodKey) {
    setReviewingWeekKey(null)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return html`
    <div style=${{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div class="intend-atmos"></div>

      <div class="intend-scroll">

        <div class="controls-row-1">
          <div class="sub-nav">
            <div
              class=${`sub-nav-btn${view === 'intentions' ? ' active' : ''}`}
              onClick=${() => setView('intentions')}
            >Intentions</div>
            <div class="sub-nav-sep">·</div>
            <div
              class=${`sub-nav-btn${view === 'reviews' ? ' active' : ''}`}
              onClick=${() => setView('reviews')}
            >Reviews</div>
          </div>
        </div>

        <div class="controls-row-2">
          <div class="month-nav">
            <div class="month-arrow" onClick=${handlePrevMonth}>‹</div>
            <div class="month-label">${controlLabel}</div>
            <div
              class="month-arrow"
              onClick=${canGoNext ? handleNextMonth : null}
              style=${{ opacity: canGoNext ? 0.6 : 0.2, cursor: canGoNext ? 'pointer' : 'default' }}
            >›</div>
          </div>

          <div class="toggle-wrap">
            <div
              class=${`toggle-btn${period === 'weeks' ? ' active' : ''}`}
              onClick=${() => { setPeriod('weeks'); setExpandedKey(null) }}
            >Weeks</div>
            <div
              class=${`toggle-btn${period === 'months' ? ' active' : ''}`}
              onClick=${() => { setPeriod('months'); setExpandedKey(null) }}
            >Month</div>
          </div>
        </div>

        ${periods.map(p => html`
          <${WeekCard}
            key=${p.periodKey}
            periodKey=${p.periodKey}
            periodType=${p.periodType}
            startDate=${p.startDate}
            endDate=${p.endDate}
            label=${p.label}
            isThisPeriod=${isThisPeriod(p.startDate, p.endDate, p.periodType, p.periodKey)}
            isOpen=${expandedKey === p.periodKey}
            view=${view}
            onToggle=${handleToggle}
            isReviewing=${reviewingWeekKey === p.periodKey}
            onReviewThisWeek=${handleReviewThisWeek}
            onStartReview=${handleStartReview}
            onReviewComplete=${handleReviewComplete}
          />
        `)}

      </div>
    </div>
  `
}
