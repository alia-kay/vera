import htm from 'https://unpkg.com/htm?module'

const html = htm.bind(React.createElement)

export default function GrowSuggestCard({ suggestion, loading, onAnother, onAddToList }) {
  const [added, setAdded] = React.useState(false)

  function handleAddToList() {
    onAddToList()
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (loading && !suggestion) {
    return html`
      <div class="g2-suggest-card" style=${{ opacity: 0.5 }}>
        <div class="g2-suggest-title-row">
          <div class="g2-suggest-title" style=${{ color: 'var(--text-dim)' }}>
            finding something for you...
          </div>
        </div>
      </div>
    `
  }

  if (!suggestion) return null

  return html`
    <div>
      <div class="g2-suggest-card">
        <div class="g2-suggest-title-row">
          <div class="g2-suggest-title">${suggestion.title}</div>
          <div class="g2-suggest-type">${suggestion.type}</div>
        </div>
        ${suggestion.author && html`
          <div class="g2-suggest-author">${suggestion.author}</div>
        `}
        ${suggestion.reason && html`
          <div class="g2-suggest-why">"${suggestion.reason}"</div>
        `}
      </div>

      <div class="g2-suggest-actions">
        <button
          class="g2-act-btn"
          onClick=${onAnother}
          disabled=${loading}
          style=${{ opacity: loading ? 0.5 : 1 }}
        >
          <svg class="g2-act-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-3-6.7"/>
            <path d="M21 4v5h-5"/>
          </svg>
          Another
        </button>
        <button class="g2-act-btn primary" onClick=${handleAddToList}>
          <svg class="g2-act-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          ${added ? 'Added ✓' : 'Add to list'}
        </button>
      </div>
    </div>
  `
}
