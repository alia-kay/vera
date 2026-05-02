import htm from 'https://unpkg.com/htm?module'
const html = htm.bind(React.createElement)

export default function SimpleButton({ label, onClick, variant = 'default', style }) {
  const cls = variant === 'amber'
    ? 'simple-btn simple-btn-amber'
    : variant === 'cancel'
    ? 'cancel-btn'
    : 'simple-btn'
  return html`<div class=${cls} style=${style || null} onClick=${onClick}>${label}</div>`
}
