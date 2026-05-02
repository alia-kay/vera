import htm from 'https://unpkg.com/htm?module'
const html = htm.bind(React.createElement)

export default function BracketButton({ label, onClick }) {
  return html`
    <div class="bracket-btn" onClick=${onClick}>
      <span class="bc-tr"></span>
      <span class="bc-bl"></span>
      <div class="bracket-btn-label">${label}</div>
    </div>
  `
}
