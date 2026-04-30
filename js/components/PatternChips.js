import htm from 'https://unpkg.com/htm?module'

const html = htm.bind(React.createElement)

export default function PatternChips({ patterns, activeFilters, onToggle }) {
  if (!patterns || patterns.length === 0) return null

  return html`
    <div class="filter-row">
      ${patterns.map(p => {
        const domain  = p.domain || 'custom'
        const isActive = activeFilters.includes(domain)
        const cls      = `filter-chip chip-${domain}${isActive ? ' active' : ''}`
        return html`
          <button
            key=${p.id || p.name}
            class=${cls}
            onClick=${() => onToggle(domain)}
          >
            <div class="chip-dot"></div>
            ${p.name}
          </button>
        `
      })}
    </div>
  `
}
