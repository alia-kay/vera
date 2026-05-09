import htm from 'https://unpkg.com/htm?module'
const html = htm.bind(React.createElement)

export default function ChatBubble({ type, text, time, streaming }) {
  if (type === 'vera_closing') {
    return html`
      <div style=${{
        textAlign: 'center',
        padding: '8px 24px 16px',
        margin: '4px 0 12px',
      }}>
        <div style=${{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '14px',
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
    return html`
      <div class="bubble-vera">
        <div class="bubble-vera-label">Vera</div>
        <div class="bubble-vera-text">
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
