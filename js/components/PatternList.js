import htm from 'https://unpkg.com/htm?module'

const html = htm.bind(React.createElement)

const DOMAIN_COLOURS = {
  physical_pain:      '#FF6B6B',
  anger_suppression:  '#2DD4BF',
  sleep:              '#7C9EFF',
  emotional_distress: '#C084FC',
  physical_tension:   '#FBBF24',
  energy_fatigue:     '#60A5FA',
  mood_low:           '#818CF8',
  cognitive:          '#A3E635',
  self_worth:         '#FB923C',
  social_relational:  '#34D399',
  appetite_body:      '#FB7185',
  custom:             '#94A3B8',
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
