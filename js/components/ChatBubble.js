import htm from 'https://unpkg.com/htm?module'
const html = htm.bind(React.createElement)

export default function ChatBubble({ type, text, time }) {
  if (type === 'thinking') {
    return html`
      <div class="bubble-vera">
        <div class="bubble-vera-label">Vera</div>
        <div class="bubble-vera-text" style=${{ opacity: 0.5, letterSpacing: '0.2em' }}>···</div>
      </div>
    `
  }

  if (type === 'vera') {
    return html`
      <div class="bubble-vera">
        <div class="bubble-vera-label">Vera</div>
        <div class="bubble-vera-text">${text}</div>
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
