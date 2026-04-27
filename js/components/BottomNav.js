import htm from 'https://unpkg.com/htm?module'
const html = htm.bind(React.createElement)

function ShareIcon({ color }) {
  return html`
    <svg width="24" height="24" viewBox="0 0 64 64" fill="none">
      <path d="M16 52 L16 30 Q16 16 32 16 Q48 16 48 30 L48 52" stroke=${color} strokeWidth="2.5" fill="none" strokeLinecap="square"/>
      <path d="M22 52 L22 32 Q22 22 32 22 Q42 22 42 32 L42 52" stroke=${color} strokeWidth="1.8" fill="none" strokeLinecap="square" opacity="0.5"/>
      <line x1="10" y1="52" x2="54" y2="52" stroke=${color} strokeWidth="2.5" strokeLinecap="square"/>
      <rect x="29" y="11" width="6" height="6" transform="rotate(45 32 14)" stroke=${color} strokeWidth="2" fill="none"/>
    </svg>
  `
}

function IntendIcon({ color }) {
  return html`
    <svg width="24" height="24" viewBox="0 0 64 64" fill="none">
      <rect x="8" y="8" width="48" height="48" transform="rotate(45 32 32)" stroke=${color} strokeWidth="2.5" fill="none" strokeLinecap="square"/>
      <rect x="16" y="16" width="32" height="32" transform="rotate(45 32 32)" stroke=${color} strokeWidth="2" fill="none" strokeLinecap="square" opacity="0.65"/>
      <rect x="22" y="22" width="20" height="20" transform="rotate(45 32 32)" stroke=${color} strokeWidth="1.8" fill="none" strokeLinecap="square" opacity="0.4"/>
      <circle cx="32" cy="32" r="3" fill=${color}/>
    </svg>
  `
}

function RememberIcon({ color }) {
  return html`
    <svg width="24" height="24" viewBox="0 0 64 64" fill="none">
      <line x1="14" y1="9" x2="50" y2="9" stroke=${color} strokeWidth="2.5" strokeLinecap="square"/>
      <line x1="14" y1="55" x2="50" y2="55" stroke=${color} strokeWidth="2.5" strokeLinecap="square"/>
      <line x1="14" y1="9" x2="32" y2="32" stroke=${color} strokeWidth="2.5" strokeLinecap="square"/>
      <line x1="50" y1="9" x2="32" y2="32" stroke=${color} strokeWidth="2.5" strokeLinecap="square"/>
      <line x1="32" y1="32" x2="14" y2="55" stroke=${color} strokeWidth="2.5" strokeLinecap="square"/>
      <line x1="32" y1="32" x2="50" y2="55" stroke=${color} strokeWidth="2.5" strokeLinecap="square"/>
      <circle cx="32" cy="32" r="2.5" fill=${color}/>
      <line x1="22" y1="46" x2="42" y2="46" stroke=${color} strokeWidth="1.5" strokeLinecap="square" opacity="0.4"/>
    </svg>
  `
}

function GrowIcon({ color }) {
  return html`
    <svg width="24" height="24" viewBox="0 0 64 64" fill="none">
      <polyline points="8,52 8,44 18,44 18,36 28,36 28,28 38,28 38,20 48,20 48,12 56,12" stroke=${color} strokeWidth="2.5" fill="none" strokeLinecap="square" strokeLinejoin="miter"/>
      <line x1="8" y1="52" x2="56" y2="52" stroke=${color} strokeWidth="1.8" opacity="0.3" strokeLinecap="square"/>
      <line x1="18" y1="44" x2="18" y2="52" stroke=${color} strokeWidth="1.8" opacity="0.3" strokeLinecap="square"/>
      <line x1="28" y1="36" x2="28" y2="52" stroke=${color} strokeWidth="1.8" opacity="0.3" strokeLinecap="square"/>
      <line x1="38" y1="28" x2="38" y2="52" stroke=${color} strokeWidth="1.8" opacity="0.3" strokeLinecap="square"/>
      <line x1="48" y1="20" x2="48" y2="52" stroke=${color} strokeWidth="1.8" opacity="0.3" strokeLinecap="square"/>
      <line x1="56" y1="12" x2="56" y2="52" stroke=${color} strokeWidth="1.8" opacity="0.3" strokeLinecap="square"/>
    </svg>
  `
}

const TABS = [
  { id: 'share',    label: 'Share',    Icon: ShareIcon    },
  { id: 'intend',   label: 'Intend',   Icon: IntendIcon   },
  { id: 'remember', label: 'Remember', Icon: RememberIcon },
  { id: 'grow',     label: 'Grow',     Icon: GrowIcon     },
]

export default function BottomNav({ activeTab, setActiveTab }) {
  return html`
    <nav style=${{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '390px',
      background: 'var(--nav-bg)',
      borderTop: '0.5px solid var(--border)',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: '12px',
      paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0px))',
      zIndex: 10,
    }}>
      ${TABS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id
        const color = isActive ? '#E8A030' : '#6A8898'
        return html`
          <button
            key=${id}
            onClick=${() => setActiveTab(id)}
            style=${{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0 12px',
              minHeight: '44px',
              minWidth: '44px',
              justifyContent: 'center',
            }}
          >
            <${Icon} color=${color} />
            <span style=${{
              fontFamily: "'Cinzel', serif",
              fontSize: '11px',
              fontWeight: 300,
              color,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}>${label}</span>
          </button>
        `
      })}
    </nav>
  `
}
