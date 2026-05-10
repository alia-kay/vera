import htm from 'https://unpkg.com/htm?module'
import OnboardingProgress from '../../components/OnboardingProgress.js'
const html = htm.bind(React.createElement)

const BackArrow = () => html`
  <svg width="16" height="16" viewBox="0 0 32 32" fill="none" style=${{ transform: 'rotate(180deg)' }}>
    <line x1="6" y1="16" x2="26" y2="16" stroke="#9ABCCC" strokeWidth="2" strokeLinecap="square"/>
    <line x1="26" y1="16" x2="18" y2="8" stroke="#9ABCCC" strokeWidth="2" strokeLinecap="square"/>
    <line x1="26" y1="16" x2="18" y2="24" stroke="#9ABCCC" strokeWidth="2" strokeLinecap="square"/>
  </svg>
`

export default function FirstIntention({ onBack, onComplete, initialValue = '' }) {
  const [text, setText] = React.useState(initialValue)

  return html`
    <div class="onboarding">
      <div class="atmos-ob atmos-5"></div>

      <div class="onboarding-content">

        <${OnboardingProgress} total=${5} current=${5} />

        <div class="ob-q-text">One last thing — what do you want to pay attention to this week?</div>
        <div class="ob-q-sub">
          Even something small. This becomes your first intention —
          you can always update it.
        </div>

        <input
          class="ob-s-input"
          type="text"
          placeholder="This week I want to notice..."
          value=${text}
          onChange=${e => setText(e.target.value)}
          onKeyDown=${e => e.key === 'Enter' && onComplete(text)}
        />

        <div class="ob-nav-row-5">
          <button class="ob-back-btn" onClick=${onBack}>
            <${BackArrow} />
          </button>
          <button class="ob-begin-btn" onClick=${() => onComplete(text)}>
            <div class="ob-begin-ln"></div>
            <div class="ob-begin-lbl">I'm ready</div>
            <div class="ob-begin-ln"></div>
          </button>
          <div class="ob-btn-spacer"></div>
        </div>

      </div>
    </div>
  `
}
