import htm from 'https://unpkg.com/htm?module'
const html = htm.bind(React.createElement)

function formatDate() {
  const now = new Date()
  const day = now.toLocaleDateString('en-US', { weekday: 'short' })
  const mon = now.toLocaleDateString('en-US', { month: 'short' })
  const date = now.getDate()
  return `${day} · ${mon} ${date}`
}

export default function Header() {
  return html`
    <header style=${{
      position: 'fixed',
      top: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '390px',
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      background: 'var(--base)',
      zIndex: 10,
      WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
      maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
    }}>
      <span style=${{
        fontFamily: "'Cinzel', serif",
        fontSize: '15px',
        fontWeight: 300,
        color: 'var(--text)',
        letterSpacing: '0.38em',
        textTransform: 'uppercase',
      }}>vera</span>

      <span style=${{
        fontFamily: "'Cinzel', serif",
        fontSize: '10px',
        fontWeight: 300,
        color: 'var(--text-dim)',
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
      }}>${formatDate()}</span>
    </header>
  `
}
