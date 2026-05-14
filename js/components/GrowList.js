import htm from 'https://unpkg.com/htm?module'
import GrowAddForm from './GrowAddForm.js'
import GrowListItem from './GrowListItem.js'

const html = htm.bind(React.createElement)

const VISIBLE_FINISHED = 2

export default function GrowList({
  aheadItems, finishedItems,
  showAddForm, onShowAddForm, onHideAddForm,
  onAdd, onMarkDone, onDelete,
}) {
  const [showMore, setShowMore] = React.useState(false)

  const visibleFinished = finishedItems.slice(0, VISIBLE_FINISHED)
  const hiddenFinished  = finishedItems.slice(VISIBLE_FINISHED)
  const hasMore         = hiddenFinished.length > 0

  return html`
    <div>
      ${showAddForm
        ? html`<${GrowAddForm} onAdd=${onAdd} onCancel=${onHideAddForm} />`
        : html`
          <div class="g2-path-cta" onClick=${onShowAddForm}>
            <div class="g2-path-cta-diamond"></div>
            <div class="g2-path-cta-text">
              <div class="g2-path-cta-title">Add to your list</div>
            </div>
          </div>
        `
      }

      ${aheadItems.length > 0 && html`
        <div class="g2-path-section-label">Ahead</div>
        ${aheadItems.map(item => html`
          <${GrowListItem} key=${item.id} item=${item} onMarkDone=${onMarkDone} onDelete=${onDelete} />
        `)}
      `}

      ${finishedItems.length > 0 && html`
        <div class="g2-path-section-label">Finished</div>
        ${visibleFinished.map(item => html`
          <${GrowListItem} key=${item.id} item=${item} onMarkDone=${onMarkDone} onDelete=${onDelete} />
        `)}

        ${hasMore && html`
          <div class=${`g2-path-more ${showMore ? 'open' : ''}`}>
            ${hiddenFinished.map(item => html`
              <${GrowListItem} key=${item.id} item=${item} onMarkDone=${onMarkDone} onDelete=${onDelete} />
            `)}
          </div>

          <button class="g2-path-toggle" onClick=${() => setShowMore(v => !v)}>
            <span class="g2-path-toggle-line"></span>
            <span class="g2-path-toggle-label">${showMore ? 'Show less' : 'Show more'}</span>
            <span class="g2-path-toggle-line"></span>
          </button>
        `}
      `}

      ${aheadItems.length === 0 && finishedItems.length === 0 && !showAddForm && html`
        <div style=${{
          padding: '24px 0 8px',
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '16px',
          fontWeight: 300,
          color: 'var(--text-dim)',
          lineHeight: 1.6,
          textAlign: 'center',
        }}>
          Your list is empty. Add something you want to read, watch, or listen to.
        </div>
      `}
    </div>
  `
}
