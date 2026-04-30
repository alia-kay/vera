import htm from 'https://unpkg.com/htm?module'

const html = htm.bind(React.createElement)

const DOMAIN_COLOURS = {
  physical_pain:      'rgba(220,100,80,0.8)',
  anger_suppression:  'rgba(74,180,160,0.8)',
  sleep:              'rgba(100,130,200,0.8)',
  emotional_distress: 'rgba(140,100,170,0.8)',
  physical_tension:   'rgba(170,150,60,0.8)',
  energy_fatigue:     'rgba(90,100,130,0.8)',
  mood_low:           'rgba(80,120,160,0.8)',
  cognitive:          'rgba(140,160,100,0.8)',
  self_worth:         'rgba(180,120,80,0.8)',
  social_relational:  'rgba(100,160,140,0.8)',
  custom:             'rgba(160,160,160,0.8)',
}

const DOMAIN_INSIGHTS = {
  physical_pain:      'Shows up most often after your emotionally heaviest days.',
  anger_suppression:  'Tends to appear in work situations — you hold it in, then feel it later.',
  sleep:              'Your hardest days often follow a poor night of sleep.',
  emotional_distress: 'Clusters around situations where you feel evaluated or visible.',
  physical_tension:   'Most present mid-week — something about that stretch of the week.',
  energy_fatigue:     'More frequent on weekdays. Something about the work rhythm drains you.',
  mood_low:           'Often connected to feeling unseen or unheard by the people around you.',
  cognitive:          "Tends to appear when you're carrying too many unresolved things at once.",
  self_worth:         "Most present when expectations — yours or others' — feel very high.",
  social_relational:  'Rises when connection with the people close to you feels thin.',
  custom:             "You've been tracking this — a pattern worth watching.",
}

function getInsight(domain) {
  return DOMAIN_INSIGHTS[domain] || 'A pattern worth paying attention to over time.'
}

function getCountLabel(pattern) {
  const n = pattern.recentCount || 0
  if (n === 0) return 'Not recently'
  if (n === 1) return '1 time this month'
  return `${n} times this month`
}

export default function PatternList({ patterns }) {
  if (!patterns || patterns.length === 0) {
    return html`
      <div class="patterns-wrap">
        <div style=${{ padding: '24px', textAlign: 'center' }}>
          <div style=${{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '16px',
            fontStyle: 'italic',
            color: 'var(--text-dim)',
            lineHeight: 1.6,
          }}>
            Patterns will appear here as you share more with Vera.
          </div>
        </div>
      </div>
    `
  }

  const sorted   = [...patterns].sort((a, b) => (b.recentCount || 0) - (a.recentCount || 0))
  const maxCount = Math.max(...sorted.map(p => p.recentCount || 0), 1)

  return html`
    <div class="patterns-wrap">
      ${sorted.map(pattern => {
        const domain   = pattern.domain || 'custom'
        const color    = DOMAIN_COLOURS[domain] || DOMAIN_COLOURS.custom
        const barWidth = Math.round(((pattern.recentCount || 0) / maxCount) * 100) + '%'

        return html`
          <div key=${pattern.id} class="pattern-row">
            <div class="pattern-top">
              <div class="pattern-left">
                <div class="pattern-indicator" style=${{ background: color }}></div>
                <div class="pattern-name">${pattern.name}</div>
              </div>
              <div class="pattern-count">${getCountLabel(pattern)}</div>
            </div>
            <div class="pattern-bar-wrap">
              <div class="pattern-bar" style=${{ width: barWidth, background: color }}></div>
            </div>
            <div class="pattern-insight">${getInsight(domain)}</div>
          </div>
        `
      })}
    </div>
  `
}
