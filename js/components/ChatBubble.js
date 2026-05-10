import htm from 'https://unpkg.com/htm?module'
const html = htm.bind(React.createElement)

function getSplitClass(splitIndex, splitTotal) {
  if (splitTotal === undefined || splitTotal <= 1) return ''
  if (splitIndex === 0)              return 'split-first'
  if (splitIndex === splitTotal - 1) return 'split-last'
  return 'split-mid'
}

export default function ChatBubble({ type, text, time, streaming, splitIndex, splitTotal }) {
  if (type === 'vera_closing') {
    return html`
      <div style=${{
        textAlign: 'center',
        padding: '8px 24px 16px',
        margin: '4px 0 12px',
      }}>
        <div style=${{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '16px',
          fontStyle: 'italic',
          fontWeight: 300,
          color: 'var(--text-dim)',
          lineHeight: 1.7,
          letterSpacing: '0.01em',
        }}>${text}</div>
      </div>
    `
  }

  if (type === 'vera') {
    const splitClass = getSplitClass(splitIndex, splitTotal)
    const showLabel  = splitIndex === undefined || splitIndex === 0

    return html`
      <div class="bubble-vera">
        ${showLabel && html`<div class="bubble-vera-label">Vera</div>`}
        <div class=${`bubble-vera-text${splitClass ? ' ' + splitClass : ''}`}>
          ${text}${streaming ? html`<span class="vera-cursor"></span>` : ''}
        </div>
      </div>
    `
  }

  return html`
    <div class="bubble-user">
      <div class="bubble-user-text">${text}</div>
      ${time && html`
        <div class="bubble-user-meta">
          <span class="bubble-time">${time}</span>
        </div>
      `}
    </div>
  `
}
