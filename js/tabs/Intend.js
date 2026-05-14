import htm from 'https://unpkg.com/htm?module'
import {
  getWeeklyIntention,
  getMonthlyIntention,
  getWeeklyReview,
  getMonthlyReview,
} from '../lib/storage.js'
import WeekCard from '../components/WeekCard.js'

const html = htm.bind(React.createElement)

// ─── ISO week helpers ─────────────────────────────────────────────────────────

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
  const start = new Date(startDateStr + 'T00:00:00')
  const end   = new Date(endDateStr   + 'T00:00:00')
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
      weeks.push({ periodKey: weekKey, periodType: 'week', startDate, endDate, label: formatWeekLabel(startDate, endDate) })
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

function getReviewStatusFor(periodType, periodKey, endDate) {
  const review = periodType === 'week' ? getWeeklyReview(periodKey) : getMonthlyReview(periodKey)
  if (review) return 'done'
  const todayStr = new Date().toISOString().split('T')[0]
  return todayStr > endDate ? 'pending' : 'not-yet'
}

// ─── IntendTab ────────────────────────────────────────────────────────────────

export default function IntendTab({ version }) {
  const today    = new Date()
  const nowYear  = today.getFullYear()
  const nowMonth = today.getMonth() + 1

  const [view,         setView]         = React.useState('intentions')
  const [displayYear,  setDisplayYear]  = React.useState(nowYear)
  const [displayMonth, setDisplayMonth] = React.useState(nowMonth)
  const [expandedKey,  setExpandedKey]  = React.useState(null)
  const [reviewingKey, setReviewingKey] = React.useState(null)

  const isCurrentMonth  = displayYear === nowYear && displayMonth === nowMonth
  const currentWeekKey  = getWeekKeyForDate(today)
  const displayMonthKey = `${displayYear}-${String(displayMonth).padStart(2, '0')}`
  const monthPeriod     = makeMonthPeriod(displayYear, displayMonth)
  const monthLabel      = `${MONTH_NAMES_FULL[displayMonth - 1]} ${displayYear}`

  function handlePrevMonth() {
    if (displayMonth === 1) { setDisplayYear(y => y - 1); setDisplayMonth(12) }
    else setDisplayMonth(m => m - 1)
    setExpandedKey(null); setReviewingKey(null)
  }

  function handleNextMonth() {
    if (displayMonth === 12) { setDisplayYear(y => y + 1); setDisplayMonth(1) }
    else setDisplayMonth(m => m + 1)
    setExpandedKey(null); setReviewingKey(null)
  }

  const weeksInMonth      = getWeeksForMonth(displayYear, displayMonth)
  const currentWeekPeriod = weeksInMonth.find(w => w.periodKey === currentWeekKey)

  // History weeks for intentions view
  const intentionHistWeeks = isCurrentMonth
    ? weeksInMonth.filter(w => w.periodKey !== currentWeekKey)
    : weeksInMonth

  // Featured period + history for reviews view
  let featuredPeriod    = null
  let reviewHistPeriods = []

  if (view === 'reviews') {
    const reviewPeriods = isCurrentMonth
      ? [...weeksInMonth].reverse()
      : [monthPeriod, ...[...weeksInMonth].reverse()]

    const firstReviewable = reviewPeriods.find(
      p => getReviewStatusFor(p.periodType, p.periodKey, p.endDate) !== 'not-yet'
    )
    if (firstReviewable) {
      featuredPeriod    = firstReviewable
      reviewHistPeriods = reviewPeriods.filter(p => p.periodKey !== firstReviewable.periodKey)
    } else {
      reviewHistPeriods = reviewPeriods
    }
  }

  const dividerLabel = isCurrentMonth
    ? 'Earlier this month'
    : `Weeks in ${MONTH_NAMES_FULL[displayMonth - 1]}`

  function handleHistToggle(key) {
    setExpandedKey(prev => {
      if (prev === key) { setReviewingKey(null); return null }
      return key
    })
    if (reviewingKey === key) setReviewingKey(null)
  }

  function handleStartReview(key) {
    setReviewingKey(key)
    setExpandedKey(key)
  }

  function handleReviewComplete() {
    setReviewingKey(null)
  }

  return html`
    <div style=${{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div class="intend-atmos"></div>

      <div class="intend-scroll">

        <div class="sub-nav-row">
          <div
            class=${`sub-nav-btn${view === 'intentions' ? ' active' : ''}`}
            onClick=${() => { setView('intentions'); setExpandedKey(null); setReviewingKey(null) }}
          >Intentions</div>
          <div class="sub-nav-sep">·</div>
          <div
            class=${`sub-nav-btn${view === 'reviews' ? ' active' : ''}`}
            onClick=${() => { setView('reviews'); setExpandedKey(null); setReviewingKey(null) }}
          >Reviews</div>
        </div>

        <div class="month-nav-row">
          <span class="month-arrow" onClick=${handlePrevMonth}>‹</span>
          <span class="month-label">${monthLabel}</span>
          <span class="month-arrow" onClick=${handleNextMonth}>›</span>
        </div>

        ${view === 'intentions' && html`
          ${isCurrentMonth && currentWeekPeriod && html`
            <${WeekCard}
              key=${currentWeekKey + '_p'}
              periodKey=${currentWeekKey}
              periodType="week"
              startDate=${currentWeekPeriod.startDate}
              endDate=${currentWeekPeriod.endDate}
              label=${currentWeekPeriod.label}
              variant="primary"
              view="intentions"
              isThisPeriod=${true}
            />
          `}

          <${WeekCard}
            key=${displayMonthKey + '_s'}
            periodKey=${displayMonthKey}
            periodType="month"
            startDate=${monthPeriod.startDate}
            endDate=${monthPeriod.endDate}
            label=${monthLabel}
            variant="secondary"
            view="intentions"
            isThisPeriod=${isCurrentMonth}
          />

          ${intentionHistWeeks.length > 0 && html`
            <div class="section-divider">
              <div class="sd-line"></div>
              <div class="sd-diamond"></div>
              <div class="sd-label">${dividerLabel}</div>
              <div class="sd-diamond"></div>
              <div class="sd-line"></div>
            </div>
            ${intentionHistWeeks.flatMap(w => {
              const row = html`
                <${WeekCard}
                  key=${w.periodKey}
                  periodKey=${w.periodKey}
                  periodType="week"
                  startDate=${w.startDate}
                  endDate=${w.endDate}
                  label=${w.label}
                  variant="hist"
                  view="intentions"
                  isOpen=${expandedKey === w.periodKey}
                  onToggle=${handleHistToggle}
                />`
              if (expandedKey !== w.periodKey) return [row]
              return [row, html`
                <${WeekCard}
                  key=${w.periodKey + '_exp'}
                  periodKey=${w.periodKey}
                  periodType="week"
                  startDate=${w.startDate}
                  endDate=${w.endDate}
                  label=${w.label}
                  variant="primary"
                  view="intentions"
                  isThisPeriod=${false}
                />`]
            })}
          `}
        `}

        ${view === 'reviews' && html`
          ${featuredPeriod && html`
            <${WeekCard}
              key=${featuredPeriod.periodKey + '_feat'}
              periodKey=${featuredPeriod.periodKey}
              periodType=${featuredPeriod.periodType}
              startDate=${featuredPeriod.startDate}
              endDate=${featuredPeriod.endDate}
              label=${featuredPeriod.label}
              variant="primary"
              view="reviews"
              isThisPeriod=${false}
              isReviewing=${reviewingKey === featuredPeriod.periodKey}
              onStartReview=${handleStartReview}
              onReviewComplete=${handleReviewComplete}
            />
          `}

          ${reviewHistPeriods.length > 0 && html`
            <div class="section-divider">
              <div class="sd-line"></div>
              <div class="sd-diamond"></div>
              <div class="sd-label">Earlier this month</div>
              <div class="sd-diamond"></div>
              <div class="sd-line"></div>
            </div>
            ${reviewHistPeriods.flatMap(p => {
              const row = html`
                <${WeekCard}
                  key=${p.periodKey}
                  periodKey=${p.periodKey}
                  periodType=${p.periodType}
                  startDate=${p.startDate}
                  endDate=${p.endDate}
                  label=${p.label}
                  variant="hist"
                  view="reviews"
                  isOpen=${expandedKey === p.periodKey}
                  onToggle=${handleHistToggle}
                />`
              if (expandedKey !== p.periodKey) return [row]
              return [row, html`
                <${WeekCard}
                  key=${p.periodKey + '_exp'}
                  periodKey=${p.periodKey}
                  periodType=${p.periodType}
                  startDate=${p.startDate}
                  endDate=${p.endDate}
                  label=${p.label}
                  variant="primary"
                  view="reviews"
                  isThisPeriod=${false}
                  isReviewing=${reviewingKey === p.periodKey}
                  onStartReview=${handleStartReview}
                  onReviewComplete=${handleReviewComplete}
                />`]
            })}
          `}

          ${!featuredPeriod && reviewHistPeriods.length === 0 && html`
            <div style=${{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '16px',
              color: 'var(--text-dim)',
              opacity: 0.45,
              textAlign: 'center',
              padding: '32px 16px',
              lineHeight: 1.6,
            }}>No reviews for this period yet.</div>
          `}
        `}

      </div>
    </div>
  `
}
