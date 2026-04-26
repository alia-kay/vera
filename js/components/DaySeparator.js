import htm from 'https://unpkg.com/htm?module'
const html = htm.bind(React.createElement)

export default function DaySeparator({ label }) {
  return html`
    <div class="day-sep">
      <div class="day-line"></div>
      <div class="day-diamond"></div>
      <div class="day-label">${label}</div>
      <div class="day-diamond"></div>
      <div class="day-line"></div>
    </div>
  `
}
