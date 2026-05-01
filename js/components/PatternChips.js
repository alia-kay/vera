import htm from 'https://unpkg.com/htm?module'
import { deleteTrackedPattern } from '../lib/storage.js'

const html = htm.bind(React.createElement)

const CONFIRM_STYLE = {
  fontFamily: "'Cinzel', serif",
  fontSize: '9px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
}

function PatternChip({ pattern, isActive, onToggle, onDelete }) {
  const [confirming, setConfirming] = React.useState(false)
  const pressTimer                  = React.useRef(null)

  function handlePressStart() {
    pressTimer.current = setTimeout(() => setConfirming(true), 500)
  }

  function handlePressEnd() {
    clearTimeout(pressTimer.current)
  }

  function handleConfirmDelete(e) {
    e.stopPropagation()
    deleteTrackedPattern(pattern.id)
    onDelete(pattern.id)
    setConfirming(false)
  }

  function handleCancelDelete(e) {
    e.stopPropagation()
    setConfirming(false)
  }

  const domain = pattern.domain || 'custom'

  if (confirming) {
    return html`
      <div
        class=${`filter-chip chip-${domain}`}
        style=${{ gap: '6px' }}
      >
        <span style=${{ ...CONFIRM_STYLE, color: 'var(--text-dim)' }}>Remove?</span>
        <span
          onClick=${handleConfirmDelete}
          style=${{ ...CONFIRM_STYLE, color: 'rgba(220,100,80,0.9)', cursor: 'pointer' }}
        >Yes</span>
        <span
          onClick=${handleCancelDelete}
          style=${{ ...CONFIRM_STYLE, color: 'var(--text-dim)', cursor: 'pointer', opacity: 0.6 }}
        >No</span>
      </div>
    `
  }

  return html`
    <div
      class=${`filter-chip chip-${domain}${isActive ? ' active' : ''}`}
      onClick=${() => onToggle(domain)}
      onMouseDown=${handlePressStart}
      onMouseUp=${handlePressEnd}
      onMouseLeave=${handlePressEnd}
      onTouchStart=${handlePressStart}
      onTouchEnd=${handlePressEnd}
    >
      <div class="chip-dot"></div>
      ${pattern.name}
    </div>
  `
}

export default function PatternChips({ patterns, activeFilters, onToggle, onDelete }) {
  if (!patterns || patterns.length === 0) return null

  return html`
    <div class="filter-row">
      ${patterns.map(p => html`
        <${PatternChip}
          key=${p.id}
          pattern=${p}
          isActive=${activeFilters.includes(p.domain || 'custom')}
          onToggle=${onToggle}
          onDelete=${onDelete}
        />
      `)}
    </div>
  `
}
