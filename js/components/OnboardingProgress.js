import htm from 'https://unpkg.com/htm?module'
const html = htm.bind(React.createElement)

export default function OnboardingProgress({ total, current }) {
  const elements = []

  for (let i = 1; i <= total; i++) {
    const dotCls = i < current ? 'ob-prog-dot done' : i === current ? 'ob-prog-dot active' : 'ob-prog-dot'
    elements.push(html`<div key=${'d' + i} class=${dotCls}></div>`)

    if (i < total) {
      const lineCls = i < current ? 'ob-prog-line done' : 'ob-prog-line'
      elements.push(html`<div key=${'l' + i} class=${lineCls}></div>`)
    }
  }

  return html`<div class="ob-progress">${elements}</div>`
}
