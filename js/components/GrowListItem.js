import htm from 'https://unpkg.com/htm?module'

const html = htm.bind(React.createElement)

function formatItemDate(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function GrowListItem({ item, onMarkDone, onDelete }) {
  const [confirming, setConfirming] = React.useState(false)
  const pressTimer = React.useRef(null)

  function startPress() {
    pressTimer.current = setTimeout(() => setConfirming(true), 500)
  }
  function cancelPress() {
    clearTimeout(pressTimer.current)
  }
  function confirmDelete() {
    if (onDelete) onDelete(item.id)
    setConfirming(false)
  }
  function cancelDelete() {
    setConfirming(false)
  }

  if (confirming) {
    return html`
      <div style=${{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px 0',
        borderBottom: '0.5px solid var(--border)',
      }}>
        <span style=${{
          fontFamily: "'Cinzel', serif",
          fontSize: '9px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--text-dim)',
        }}>Remove?</span>
        <span
          onClick=${confirmDelete}
          style=${{
            fontFamily: "'Cinzel', serif",
            fontSize: '9px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#FF6B6B',
            cursor: 'pointer',
          }}
        >Yes</span>
        <span
          onClick=${cancelDelete}
          style=${{
            fontFamily: "'Cinzel', serif",
            fontSize: '9px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-dim)',
            opacity: 0.6,
            cursor: 'pointer',
          }}
        >No</span>
      </div>
    `
  }

  const isAhead = item.status === 'ahead'

  return html`
    <div
      class=${`g2-path-item ${isAhead ? 'upcoming' : 'past'}`}
      onMouseDown=${startPress}
      onMouseUp=${cancelPress}
      onMouseLeave=${cancelPress}
      onTouchStart=${startPress}
      onTouchEnd=${cancelPress}
    >
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
