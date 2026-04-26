import htm from 'https://unpkg.com/htm?module'
const html = htm.bind(React.createElement)

export default function Welcome({ onNext }) {
  const [name, setName] = React.useState('')

  return html`
    <div class="onboarding">
      <div class="atmos-ob atmos-1"></div>

      <div class="onboarding-content">

        <div class="ob-mv-orn">
          <div class="ob-orn-ln"></div>
          <div class="ob-orn-dm"></div>
          <div class="ob-orn-ln"></div>
        </div>

        <div class="ob-app-name">vera</div>

        <div class="ob-tagline">
          A friend who listens, helps you understand your emotions,
          and nudges you forward.<br /><br />
          She remembers what you share and notices things over time.
        </div>

        <div class="ob-field-label">What should Vera call you?</div>

        <input
          class="ob-name-input"
          type="text"
          placeholder="Your name..."
          value=${name}
          onChange=${e => setName(e.target.value)}
          onKeyDown=${e => e.key === 'Enter' && onNext(name)}
        />

        <div class="ob-optional">Optional</div>

        <div style=${{ flex: 1 }}></div>

        <div class="ob-begin-wrap">
          <button class="ob-begin-btn" onClick=${() => onNext(name)}>
            <div class="ob-begin-ln"></div>
            <div class="ob-begin-lbl">Begin</div>
            <div class="ob-begin-ln"></div>
          </button>
        </div>

      </div>
    </div>
  `
}
