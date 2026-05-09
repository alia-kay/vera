import htm from 'https://unpkg.com/htm?module'

const html = htm.bind(React.createElement)

function formatRelativeDate(isoString) {
  if (!isoString) return ''
  const age = (Date.now() - new Date(isoString).getTime()) / 86400000
  if (age < 1)  return 'Today'
  if (age < 2)  return 'Yesterday'
  const days = Math.floor(age)
  if (days < 7) return `${days} days ago`
  return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function GrowNoticesCard({ notice, onDismiss }) {
  if (!notice) return null

  return html`
    <div class="g2-notices-card" style=${{ position: 'relative' }}>
      <button
        onClick=${onDismiss}
        style=${{
          position: 'absolute',
          top: '10px',
          right: '12px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          fontSize: '16px',
          lineHeight: 1,
          padding: '4px',
          opacity: 0.6,
        }}
      >✕</button>
      <div class="g2-notices-label">Vera notices</div>
      <div class="obs-diamond-row">
        <div class="obs-diamond"></div>
        <div class="g2-notices-text">${notice.text}</div>
      </div>
      <div class="g2-notices-date">${formatRelativeDate(notice.generatedAt)}</div>
    </div>
  `
}
