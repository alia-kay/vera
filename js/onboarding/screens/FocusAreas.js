import htm from 'https://unpkg.com/htm?module'
import OnboardingProgress from '../../components/OnboardingProgress.js'
const html = htm.bind(React.createElement)

const BackArrow = () => html`
  <svg width="16" height="16" viewBox="0 0 32 32" fill="none" style=${{ transform: 'rotate(180deg)' }}>
    <line x1="6" y1="16" x2="26" y2="16" stroke="#7A9AAA" strokeWidth="2" strokeLinecap="square"/>
    <line x1="26" y1="16" x2="18" y2="8" stroke="#7A9AAA" strokeWidth="2" strokeLinecap="square"/>
    <line x1="26" y1="16" x2="18" y2="24" stroke="#7A9AAA" strokeWidth="2" strokeLinecap="square"/>
  </svg>
`

const NextArrow = () => html`
  <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
    <line x1="6" y1="16" x2="26" y2="16" stroke="#101820" strokeWidth="2" strokeLinecap="square"/>
    <line x1="26" y1="16" x2="18" y2="8" stroke="#101820" strokeWidth="2" strokeLinecap="square"/>
    <line x1="26" y1="16" x2="18" y2="24" stroke="#101820" strokeWidth="2" strokeLinecap="square"/>
  </svg>
`

const FOCUS_OPTIONS = [
  { id: 'emotions',   label: 'Managing emotions' },
  { id: 'career',     label: 'Career direction' },
  { id: 'patterns',   label: 'Understanding patterns' },
  { id: 'awareness',  label: 'Self-awareness & growth' },
  { id: 'symptoms',   label: 'Tracking symptoms' },
  { id: 'thinking',   label: 'Somewhere to think out loud' },
]

export default function FocusAreas({ onBack, onNext, initialSelected = [] }) {
  const [selected, setSelected] = React.useState(initialSelected)

  function toggle(id) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  return html`
    <div class="onboarding">
      <div class="atmos-ob atmos-4"></div>

      <div class="onboarding-content">

        <${OnboardingProgress} total=${5} current=${4} />

        <div class="ob-q-text">What would you like Vera to help with?</div>
        <div class="ob-q-sub">Choose as many as feel right. You can always change this later.</div>

        <div class="ob-options">
          ${FOCUS_OPTIONS.map(opt => {
            const cls = 'ob-option' + (selected.includes(opt.id) ? ' selected' : '')
            return html`
              <button key=${opt.id} class=${cls} onClick=${() => toggle(opt.id)}>
                ${opt.label}
              </button>
            `
          })}
        </div>

        <div class="ob-nav-row">
          <button class="ob-back-btn" onClick=${onBack}>
            <${BackArrow} />
          </button>
          <button class="ob-next-btn" onClick=${() => onNext(selected)}>
            <${NextArrow} />
          </button>
        </div>

      </div>
    </div>
  `
}
