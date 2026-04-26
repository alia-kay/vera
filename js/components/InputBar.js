import htm from 'https://unpkg.com/htm?module'
const html = htm.bind(React.createElement)

const SendArrow = () => html`
  <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
    <line x1="16" y1="26" x2="16" y2="6" stroke="#101820" stroke-width="2" stroke-linecap="square"/>
    <line x1="16" y1="6" x2="8" y2="14" stroke="#101820" stroke-width="2" stroke-linecap="square"/>
    <line x1="16" y1="6" x2="24" y2="14" stroke="#101820" stroke-width="2" stroke-linecap="square"/>
  </svg>
`

function ShareIcon({ color }) {
  return html`
    <svg width="24" height="24" viewBox="0 0 64 64" fill="none">
      <path d="M16 52 L16 30 Q16 16 32 16 Q48 16 48 30 L48 52" stroke=${color} stroke-width="2.5" fill="none" stroke-linecap="square"/>
      <path d="M22 52 L22 32 Q22 22 32 22 Q42 22 42 32 L42 52" stroke=${color} stroke-width="1.8" fill="none" stroke-linecap="square" opacity="0.5"/>
      <line x1="10" y1="52" x2="54" y2="52" stroke=${color} stroke-width="2.5" stroke-linecap="square"/>
      <rect x="29" y="11" width="6" height="6" transform="rotate(45 32 14)" stroke=${color} stroke-width="2" fill="none"/>
    </svg>
  `
}

function IntendIcon({ color }) {
  return html`
    <svg width="24" height="24" viewBox="0 0 64 64" fill="none">
      <rect x="8" y="8" width="48" height="48" transform="rotate(45 32 32)" stroke=${color} stroke-width="2.5" fill="none" stroke-linecap="square"/>
      <rect x="16" y="16" width="32" height="32" transform="rotate(45 32 32)" stroke=${color} stroke-width="2" fill="none" stroke-linecap="square" opacity="0.65"/>
      <rect x="22" y="22" width="20" height="20" transform="rotate(45 32 32)" stroke=${color} stroke-width="1.8" fill="none" stroke-linecap="square" opacity="0.4"/>
      <circle cx="32" cy="32" r="3" fill=${color}/>
    </svg>
  `
}

function RememberIcon({ color }) {
  return html`
    <svg width="24" height="24" viewBox="0 0 64 64" fill="none">
      <line x1="14" y1="9" x2="50" y2="9" stroke=${color} stroke-width="2.5" stroke-linecap="square"/>
      <line x1="14" y1="55" x2="50" y2="55" stroke=${color} stroke-width="2.5" stroke-linecap="square"/>
      <line x1="14" y1="9" x2="32" y2="32" stroke=${color} stroke-width="2.5" stroke-linecap="square"/>
      <line x1="50" y1="9" x2="32" y2="32" stroke=${color} stroke-width="2.5" stroke-linecap="square"/>
      <line x1="32" y1="32" x2="14" y2="55" stroke=${color} stroke-width="2.5" stroke-linecap="square"/>
      <line x1="32" y1="32" x2="50" y2="55" stroke=${color} stroke-width="2.5" stroke-linecap="square"/>
      <circle cx="32" cy="32" r="2.5" fill=${color}/>
      <line x1="22" y1="46" x2="42" y2="46" stroke=${color} stroke-width="1.5" stroke-linecap="square" opacity="0.4"/>
    </svg>
  `
}

function GrowIcon({ color }) {
  return html`
    <svg width="24" height="24" viewBox="0 0 64 64" fill="none">
      <polyline points="8,52 8,44 18,44 18,36 28,36 28,28 38,28 38,20 48,20 48,12 56,12" stroke=${color} stroke-width="2.5" fill="none" stroke-linecap="square" stroke-linejoin="miter"/>
      <line x1="8" y1="52" x2="56" y2="52" stroke=${color} stroke-width="1.8" opacity="0.3" stroke-linecap="square"/>
      <line x1="18" y1="44" x2="18" y2="52" stroke=${color} stroke-width="1.8" opacity="0.3" stroke-linecap="square"/>
      <line x1="28" y1="36" x2="28" y2="52" stroke=${color} stroke-width="1.8" opacity="0.3" stroke-linecap="square"/>
      <line x1="38" y1="28" x2="38" y2="52" stroke=${color} stroke-width="1.8" opacity="0.3" stroke-linecap="square"/>
      <line x1="48" y1="20" x2="48" y2="52" stroke=${color} stroke-width="1.8" opacity="0.3" stroke-linecap="square"/>
      <line x1="56" y1="12" x2="56" y2="52" stroke=${color} stroke-width="1.8" opacity="0.3" stroke-linecap="square"/>
    </svg>
  `
}

const NAV_TABS = [
  { id: 'share',    label: 'Share',    Icon: ShareIcon    },
  { id: 'intend',   label: 'Intend',   Icon: IntendIcon   },
  { id: 'remember', label: 'Remember', Icon: RememberIcon },
  { id: 'grow',     label: 'Grow',     Icon: GrowIcon     },
]

export default function InputBar({ value, onChange, onSend, disabled, onTabChange }) {
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return html`
    <div class="input-bar">

      <div class="input-gradient"></div>

      <div class="input-wrap">
        <div class="input-inner">
          <textarea
            class="input-field"
            placeholder="Say something..."
            rows="2"
            value=${value}
            onInput=${e => onChange(e.target.value)}
            onKeyDown=${handleKeyDown}
            disabled=${disabled}
          ></textarea>
          <div class="input-actions">
            <button class="send-btn" onClick=${onSend} disabled=${disabled}>
              <${SendArrow} />
            </button>
          </div>
        </div>
      </div>

      <nav class="share-nav">
        ${NAV_TABS.map(({ id, label, Icon }) => {
          const isActive = id === 'share'
          const color = isActive ? '#E8A030' : '#6A8898'
          const cls = 'share-nav-item ' + (isActive ? 'active' : 'inactive')
          return html`
            <button key=${id} class=${cls} onClick=${() => onTabChange && onTabChange(id)}>
              <${Icon} color=${color} />
              <span class="share-nav-label">${label}</span>
            </button>
          `
        })}
      </nav>

    </div>
  `
}
