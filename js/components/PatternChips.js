import htm from 'https://unpkg.com/htm?module'

const html = htm.bind(React.createElement)

// 12 bright, maximally distinct colours — all clearly visible on #101820
const CHIP_COLOURS = [
  '#FF6B6B', // coral red
  '#2DD4BF', // bright teal
  '#FBBF24', // warm gold
  '#C084FC', // violet
  '#34D399', // mint green
  '#FB923C', // peach orange
  '#7C9EFF', // periwinkle blue
  '#F472B6', // hot pink
  '#A3E635', // lime green
  '#818CF8', // slate indigo
  '#38BDF8', // sky blue
  '#FB7185', // rose
]

export function getPatternColour(index) {
  return CHIP_COLOURS[index % CHIP_COLOURS.length]
}

const CONFIRM_STYLE = {
  fontFamily: "'Cinzel', serif",
  fontSize: '9px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
}

function PatternChip({ pattern, colour, isActive, onToggle, onDelete }) {
  const [confirming, setConfirming] = React.useState(false)
  const pressTimer                  = React.useRef(null)

  function startPress() {
    pressTimer.current = setTimeout(() => setConfirming(true), 500)
  }
  function cancelPress() {
    clearTimeout(pressTimer.current)
  }
  function confirmDelete(e) {
    e.stopPropagation()
    onDelete(pattern.id)
    setConfirming(false)
  }

  if (confirming) {
    return html`
      <div class="filter-chip" style=${{ gap: '6px' }}>
        <span style=${{ ...CONFIRM_STYLE, color: 'var(--text-dim)' }}>Remove?</span>
        <span onClick=${confirmDelete} style=${{ ...CONFIRM_STYLE, color: '#FF6B6B', cursor: 'pointer' }}>Yes</span>
        <span onClick=${e => { e.stopPropagation(); setConfirming(false) }}
          style=${{ ...CONFIRM_STYLE, color: 'var(--text-dim)', cursor: 'pointer', opacity: 0.6 }}>No</span>
      </div>
    `
  }

  return html`
    <div
      class="filter-chip"
      style=${{
        borderColor: isActive ? colour + '80' : 'var(--border)',
        background:  isActive ? colour + '1A' : 'transparent',
        color:       isActive ? colour : 'var(--text-dim)',
      }}
      onClick=${() => onToggle(pattern.id)}
      onMouseDown=${startPress}
      onMouseUp=${cancelPress}
      onMouseLeave=${cancelPress}
      onTouchStart=${startPress}
      onTouchEnd=${cancelPress}
    >
      <div class="chip-dot" style=${{ background: colour }}></div>
      ${pattern.name}
    </div>
  `
}

export default function PatternChips({ patterns, activeFilters, onToggle, onDelete }) {
  if (!patterns || patterns.length === 0) return null

  return html`
    <div class="filter-row">
      ${patterns.map((p, index) => html`
        <${PatternChip}
          key=${p.id}
          pattern=${p}
          colour=${getPatternColour(index)}
          isActive=${activeFilters.includes(p.id)}
          onToggle=${onToggle}
          onDelete=${onDelete}
        />
      `)}
    </div>
  `
}
