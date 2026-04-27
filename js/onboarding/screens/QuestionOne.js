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

export default function QuestionOne({ onBack, onNext, initialValue = '' }) {
  const [text, setText] = React.useState(initialValue)

  // TODO: add Vera response when AI is connected in a later step

  return html`
    <div class="onboarding">
      <div class="atmos-ob atmos-2"></div>

      <div class="onboarding-content">

        <${OnboardingProgress} total=${5} current=${2} />

        <div class="ob-q-text">What's been on your mind lately?</div>
        <div class="ob-q-sub">
          In life, work, or just how you've been feeling.
          No need to summarise — whatever comes up first.
        </div>

        <textarea
          class="ob-textarea"
          placeholder="Start writing..."
          value=${text}
          onChange=${e => setText(e.target.value)}
        ></textarea>

        <div class="ob-nav-row">
          <button class="ob-back-btn" onClick=${onBack}>
            <${BackArrow} />
          </button>
          <button class="ob-next-btn" onClick=${() => onNext(text)}>
            <${NextArrow} />
          </button>
        </div>

      </div>
    </div>
  `
}
