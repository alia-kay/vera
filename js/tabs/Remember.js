import htm from 'https://unpkg.com/htm?module'
import { getEntriesForDate } from '../lib/storage.js'
import MoodCalendar from '../components/MoodCalendar.js'
import EntryViewer from '../components/EntryViewer.js'
import PatternList from '../components/PatternList.js'

const html = htm.bind(React.createElement)

export default function RememberTab({ trackedPatterns, onPatternDeleted }) {
  const today = new Date()
  const [displayYear,     setDisplayYear]     = React.useState(today.getFullYear())
  const [displayMonth,    setDisplayMonth]    = React.useState(today.getMonth() + 1)
  const [selectedDate,    setSelectedDate]    = React.useState(null)
  const [selectedEntries, setSelectedEntries] = React.useState([])
  const [activeFilters,   setActiveFilters]   = React.useState([])
  const [recapCache,      setRecapCache]      = React.useState({})

  function handleDaySelect(dateStr) {
    if (selectedDate === dateStr) {
      setSelectedDate(null)
      setSelectedEntries([])
      return
    }
    const entries = getEntriesForDate(dateStr)
    if (entries.length > 0) {
      setSelectedDate(dateStr)
      setSelectedEntries(entries)
    }
  }

  function handleFilterToggle(patternId) {
    setActiveFilters(prev =>
      prev.includes(patternId)
        ? prev.filter(id => id !== patternId)
        : [...prev, patternId]
    )
  }

  function handlePrevMonth() {
    if (displayMonth === 1) {
      setDisplayYear(y => y - 1)
      setDisplayMonth(12)
    } else {
      setDisplayMonth(m => m - 1)
    }
    setSelectedDate(null)
    setSelectedEntries([])
  }

  function handleNextMonth() {
    const now = new Date()
    if (displayYear === now.getFullYear() && displayMonth === now.getMonth() + 1) return
    if (displayMonth === 12) {
      setDisplayYear(y => y + 1)
      setDisplayMonth(1)
    } else {
      setDisplayMonth(m => m + 1)
    }
    setSelectedDate(null)
    setSelectedEntries([])
  }

  function handleClose() {
    setSelectedDate(null)
    setSelectedEntries([])
  }

  function handlePatternDelete(patternId) {
    setActiveFilters(prev => prev.filter(id => id !== patternId))
    if (onPatternDeleted) onPatternDeleted()
  }

  function handleRecapGenerated(date, text) {
    setRecapCache(prev => ({ ...prev, [date]: text }))
  }

  return html`
    <div style=${{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div class="remember-atmos"></div>
      <div class="remember-scroll">

        <${MoodCalendar}
          year=${displayYear}
          month=${displayMonth}
          selectedDate=${selectedDate}
          activeFilters=${activeFilters}
          onDaySelect=${handleDaySelect}
          onPrevMonth=${handlePrevMonth}
          onNextMonth=${handleNextMonth}
          patterns=${trackedPatterns}
          onToggle=${handleFilterToggle}
          onDelete=${handlePatternDelete}
        />

        ${selectedDate && selectedEntries.length > 0 && html`
          <${EntryViewer}
            date=${selectedDate}
            entries=${selectedEntries}
            onClose=${handleClose}
            recapCache=${recapCache}
            onRecapGenerated=${handleRecapGenerated}
          />
        `}

        <div class="mv-divider">
          <div class="mv-div-line"></div>
          <div class="mv-div-diamond"></div>
          <div class="mv-div-label">Patterns & insights</div>
          <div class="mv-div-diamond"></div>
          <div class="mv-div-line"></div>
        </div>

        <${PatternList} patterns=${trackedPatterns} />

      </div>
    </div>
  `
}
