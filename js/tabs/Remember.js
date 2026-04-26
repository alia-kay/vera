import htm from 'https://unpkg.com/htm?module'
const html = htm.bind(React.createElement)

export default function RememberTab() {
  return html`
    <div style=${{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: '12px',
      textAlign: 'center',
    }}>
      <span style=${{
        fontFamily: "'Cinzel', serif",
        fontSize: '18px',
        fontWeight: 300,
        color: 'var(--text)',
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
      }}>Remember</span>
      <span style=${{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: '16px',
        fontStyle: 'italic',
        fontWeight: 300,
        color: 'var(--text-dim)',
      }}>Your mood calendar and patterns live here.</span>
    </div>
  `
}
