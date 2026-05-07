import htm from 'https://unpkg.com/htm?module'

const html = htm.bind(React.createElement)

function formatItemDate(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function GrowListItem({ item, onMarkDone }) {
  const isAhead = item.status === 'ahead'

  return html`
    <div class=${`g2-path-item ${isAhead ? 'upcoming' : 'past'}`}>
      ${isAhead
        ? html`
          <div
            onClick=${() => onMarkDone(item.id)}
            title="Mark as finished"
            style=${{ padding: '10px', margin: '-10px', marginTop: 'calc(6px - 10px)', cursor: 'pointer', flexShrink: 0 }}
          >
            <div class="g2-path-marker" style=${{ marginTop: 0 }}></div>
          </div>
        `
        : html`<div class="g2-path-marker"></div>`
      }
      <div class="g2-path-body">
        <div class="g2-path-row1">
          <div class="g2-path-title">${item.title}</div>
          <div class="g2-path-type">${item.type}</div>
        </div>
        ${item.author && html`
          <div style=${{
            fontFamily: "'Cinzel',serif",
            fontSize: '9px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-dim)',
            opacity: 0.7,
            marginBottom: '2px',
          }}>${item.author}</div>
        `}
        ${!isAhead && html`
          <div class="g2-path-meta">${formatItemDate(item.completedAt)}</div>
        `}
      </div>
    </div>
  `
}
