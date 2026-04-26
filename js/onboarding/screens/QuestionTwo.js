import htm from 'https://unpkg.com/htm?module'
import OnboardingProgress from '../../components/OnboardingProgress.js'
const html = htm.bind(React.createElement)

const BackArrow = () => html`
  <svg width="16" height="16" viewBox="0 0 32 32" fill="none" style=${{ transform: 'rotate(180deg)' }}>
    <line x1="6" y1="16" x2="26" y2="16" stroke="#7A9AAA" stroke-width="2" stroke-linecap="square"/>
    <line x1="26" y1="16" x2="18" y2="8" stroke="#7A9AAA" stroke-width="2" stroke-linecap="square"/>
    <line x1="26" y1="16" x2="18" y2="24" stroke="#7A9AAA" stroke-width="2" stroke-linecap="square"/>
  </svg>
`

const NextArrow = () => html`
  <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
    <line x1="6" y1="16" x2="26" y2="16" stroke="#101820" stroke-width="2" stroke-linecap="square"/>
    <line x1="26" y1="16" x2="18" y2="8" stroke="#101820" stroke-width="2" stroke-linecap="square"/>
    <line x1="26" y1="16" x2="18" y2="24" stroke="#101820" stroke-width="2" stroke-linecap="square"/>
  </svg>
`

const BRANCH_CONTENT = {
  career: {
    question: "What kind of work do you do — and how does it feel right now?",
    sub: "Just a sense of where things stand."
  },
  emotional: {
    question: "What's been the heaviest thing you've been carrying lately?",
    sub: "You don't need to explain all of it — just the part that's most present."
  },
  neutral: {
    question: "What's one thing you'd like to understand better about yourself?",
    sub: "No right answer. Whatever feels true."
  }
}

export default function QuestionTwo({ branch, onBack, onNext, initialValue = '' }) {
  const [text, setText] = React.useState(initialValue)
  const content = BRANCH_CONTENT[branch] || BRANCH_CONTENT.neutral

  // TODO: add Vera response when AI is connected in a later step

  return html`
    <div class="onboarding">
      <div class="atmos-ob atmos-3"></div>

      <div class="onboarding-content">

        <${OnboardingProgress} total=${5} current=${3} />

        <div class="ob-q-text">${content.question}</div>
        <div class="ob-q-sub">${content.sub}</div>

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
