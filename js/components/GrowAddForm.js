import htm from 'https://unpkg.com/htm?module'

const html = htm.bind(React.createElement)

const TYPES    = ['Book', 'Film', 'Podcast', 'Article', 'Other']
const STATUSES = ['Ahead', 'Finished']

export default function GrowAddForm({ onAdd, onCancel }) {
  const [title,   setTitle]   = React.useState('')
  const [author,  setAuthor]  = React.useState('')
  const [type,    setType]    = React.useState('Book')
  const [status,  setStatus]  = React.useState('ahead')

  function handleAdd() {
    if (!title.trim()) return
    onAdd({
      title:  title.trim(),
      author: author.trim() || null,
      type,
      status,
    })
    setTitle('')
    setAuthor('')
    setType('Book')
    setStatus('ahead')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleAdd()
  }

  return html`
    <div class="g2-add-form">
      <div class="g2-type-pills" style=${{ marginBottom: '10px' }}>
        ${STATUSES.map(s => {
          const val = s.toLowerCase()
          return html`
            <div
              key=${s}
              class=${`g2-type-pill ${status === val ? 'selected' : ''}`}
              onClick=${() => setStatus(val)}
            >${s}</div>
          `
        })}
      </div>
      <input
        class="g2-add-input"
        placeholder="Title..."
        value=${title}
        onInput=${e => setTitle(e.target.value)}
        onKeyDown=${handleKeyDown}
        autoFocus=${true}
      />
      <input
        class="g2-add-input"
        placeholder="Author, director, host... (optional)"
        value=${author}
        onInput=${e => setAuthor(e.target.value)}
        onKeyDown=${handleKeyDown}
      />
      <div class="g2-type-pills">
        ${TYPES.map(t => html`
          <div
            key=${t}
            class=${`g2-type-pill ${type === t ? 'selected' : ''}`}
            onClick=${() => setType(t)}
          >${t}</div>
        `)}
      </div>
      <div class="g2-add-actions">
        <div class="amber-btn" onClick=${handleAdd}>Add</div>
        <div class="simple-btn" onClick=${onCancel}>Cancel</div>
      </div>
    </div>
  `
}
