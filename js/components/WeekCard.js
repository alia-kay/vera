import htm from 'https://unpkg.com/htm?module'
import {
  getWeeklyIntention, saveWeeklyIntention, updateWeeklyIntentionItem,
  getMonthlyIntention, saveMonthlyIntention, updateMonthlyIntentionItem,
  getWeeklyReview, saveWeeklyReview,
  getMonthlyReview, saveMonthlyReview,
  generateId,
} from '../lib/storage.js'
import { generateWeeklyReview } from '../lib/api.js'
import SimpleButton from './SimpleButton.js'

const html = htm.bind(React.createElement)

const FOCUS_WORDS = [
  'Rest', 'Quiet', 'Honesty', 'Creativity', 'Courage',
  'Presence', 'Movement', 'Nourishment', 'Connection', 'Play',
]

const WEEKLY_QUESTIONS = [
  'How did this week actually feel?',
  'What was the hardest moment this week — and what was the best one?',
  'What do you want to carry forward from this week?',
]

const MONTHLY_QUESTIONS = [
  'How would you describe the shape of this month?',
  'What shifted in you — even slightly — that you want to carry forward?',
  'What do you want to move toward next month?',
]

// ─── Checklist item ───────────────────────────────────────────────────────────

function CheckItem({ item, onToggle, editMode, onDelete }) {
  return html`
    <div
      class="check-item"
      style=${editMode ? { justifyContent: 'space-between' } : null}
      onClick=${!editMode ? () => onToggle(item.id, !item.checked) : null}
    >
      <div style=${{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div class=${`check-box${item.checked ? ' checked' : ''}`}></div>
        <div class=${`check-text${item.checked && !editMode ? ' done' : ''}`}>${item.text}</div>
      </div>
      ${editMode && html`
        <span
          style=${{ color: 'var(--text-dim)', opacity: 0.4, cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}
          onClick=${() => onDelete(item.id)}
        >×</span>
      `}
    </div>
  `
}

// ─── Intentions view ──────────────────────────────────────────────────────────

function IntentionView({ intention, periodKey, periodType, endDate, onStartEdit, onReviewThisWeek, localVersion, setLocalVersion }) {
  function handleToggleItem(itemId, checked) {
    if (periodType === 'week') {
      updateWeeklyIntentionItem(periodKey, itemId, checked)
    } else {
      updateMonthlyIntentionItem(periodKey, itemId, checked)
    }
    setLocalVersion(v => v + 1)
  }

  const items      = intention?.items      || []
  const focusWords = intention?.focusWords || []

  return html`
    <div class="week-card-expanded">
      <div class="intention-header">
        <div class="intention-sentence">"${intention.sentence}"</div>
        <${SimpleButton}
          label="Edit"
          style=${{ width: 'auto', padding: '5px 10px' }}
          onClick=${onStartEdit}
        />
      </div>

      ${periodType === 'week' && items.length > 0 && html`
        <div class="checklist">
          ${items.map(item => html`
            <${CheckItem}
              key=${item.id}
              item=${item}
              onToggle=${handleToggleItem}
              editMode=${false}
            />
          `)}
        </div>
      `}

      ${focusWords.length > 0 && html`
        <div class="focus-pills">
          ${focusWords.map(w => html`<div key=${w} class="focus-pill">${w}</div>`)}
        </div>
      `}

      ${periodType === 'week' && html`
        <div class="amber-btn" onClick=${() => onReviewThisWeek(periodKey, endDate)}>
          Review this week
        </div>
      `}
    </div>
  `
}

// ─── Intentions edit ──────────────────────────────────────────────────────────

function IntentionEdit({ periodKey, periodType, startDate, endDate, intention, onCancel, onSaved }) {
  const [editSentence,       setEditSentence]       = React.useState(intention?.sentence || '')
  const [editItems,          setEditItems]          = React.useState(intention?.items    || [])
  const [newItemText,        setNewItemText]        = React.useState('')
  const [selectedFocusWords, setSelectedFocusWords] = React.useState(intention?.focusWords || [])

  function handleAddItem() {
    const text = newItemText.trim()
    if (!text) return
    setEditItems(prev => [...prev, { id: generateId(), text, checked: false }])
    setNewItemText('')
  }

  function handleDeleteItem(id) {
    setEditItems(prev => prev.filter(item => item.id !== id))
  }

  function toggleFocusWord(word) {
    setSelectedFocusWords(prev =>
      prev.includes(word) ? prev.filter(w => w !== word) : [...prev, word]
    )
  }

  function handleSave() {
    const data = {
      sentence:   editSentence.trim(),
      focusWords: selectedFocusWords,
      items:      editItems,
      startDate,
      endDate,
    }
    if (periodType === 'week') {
      saveWeeklyIntention(periodKey, data)
    } else {
      saveMonthlyIntention(periodKey, data)
    }
    onSaved()
  }

  const isMonthly = periodType === 'month'

  return html`
    <div class="edit-wrap">
      <div class="edit-hint">editing</div>
      <textarea
        class="edit-textarea"
        placeholder=${isMonthly
          ? 'What do you want to move toward this month?'
          : 'What do you want this week to feel like?'
        }
        value=${editSentence}
        onInput=${e => setEditSentence(e.target.value)}
      ></textarea>

      ${isMonthly && html`
        <div style=${{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '16px',
          fontStyle: 'italic',
          color: 'var(--text-dim)',
          opacity: 0.6,
          lineHeight: 1.6,
          marginBottom: '10px',
          paddingLeft: '2px',
        }}>
          Think direction, not tasks. What would it mean if this month felt different?
        </div>
      `}

      ${!isMonthly && html`
        <div class="add-item-row">
          <input
            class="add-item-input"
            placeholder="Add intention..."
            value=${newItemText}
            onInput=${e => setNewItemText(e.target.value)}
            onKeyDown=${e => e.key === 'Enter' && handleAddItem()}
          />
          <div class="add-item-btn" onClick=${handleAddItem}>+</div>
        </div>
      `}

      ${!isMonthly && editItems.length > 0 && html`
        <div class="checklist">
          ${editItems.map(item => html`
            <${CheckItem}
              key=${item.id}
              item=${item}
              editMode=${true}
              onDelete=${handleDeleteItem}
            />
          `)}
        </div>
      `}

      <div class="focus-pills-select">
        ${FOCUS_WORDS.map(word => html`
          <div
            key=${word}
            class=${`focus-pill-select${selectedFocusWords.includes(word) ? ' selected' : ''}`}
            onClick=${() => toggleFocusWord(word)}
          >${word}</div>
        `)}
      </div>

      <div class="amber-btn" onClick=${handleSave}>Save</div>
      <${SimpleButton} label="Cancel" variant="cancel" onClick=${onCancel} />
    </div>
  `
}

// ─── Review form (3-question inline) ─────────────────────────────────────────

function ReviewForm({ periodKey, periodType, intention, existingAnswers, onComplete, onCancel }) {
  const isMonthly = periodType === 'month'
  const questions = isMonthly ? MONTHLY_QUESTIONS : WEEKLY_QUESTIONS

  const [answers,    setAnswers]    = React.useState(existingAnswers || Array(questions.length).fill(''))
  const [currentQ,   setCurrentQ]   = React.useState(0)
  const [generating, setGenerating] = React.useState(false)

  function handleNext() {
    if (currentQ < questions.length - 1) {
      setCurrentQ(q => q + 1)
    } else {
      handleDone()
    }
  }

  function handleBack() {
    if (currentQ > 0) setCurrentQ(q => q - 1)
    else onCancel()
  }

  async function handleDone() {
    setGenerating(true)
    try {
      const result = await generateWeeklyReview(answers, questions, intention, isMonthly)
      const reviewData = {
        questions,
        answers,
        insights: result.insights,
        moodWord: result.moodWord,
      }
      if (!isMonthly) {
        saveWeeklyReview(periodKey, reviewData)
      } else {
        saveMonthlyReview(periodKey, reviewData)
      }
      onComplete()
    } catch (err) {
      if (window.VERA_DEBUG) console.log('[Vera] Review generation failed:', err)
      onComplete()
    } finally {
      setGenerating(false)
    }
  }

  if (generating) {
    return html`
      <div style=${{ padding: '20px 0', textAlign: 'center' }}>
        <div style=${{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '16px',
          fontStyle: 'italic',
          color: 'var(--text-dim)',
          lineHeight: 1.6,
        }}>Vera is reading your week...</div>
      </div>
    `
  }

  return html`
    <div>
      <div class="review-progress">
        ${questions.map((_, i) => html`
          <div key=${i} class=${`review-prog-dot${i < currentQ ? ' done' : i === currentQ ? ' active' : ''}`}></div>
          ${i < questions.length - 1 && html`
            <div class=${`review-prog-line${i < currentQ ? ' done' : ''}`}></div>
          `}
        `)}
      </div>

      <div class="review-question">"${questions[currentQ]}"</div>

      <textarea
        class="review-answer-area"
        placeholder="Write whatever comes..."
        value=${answers[currentQ]}
        onInput=${e => {
          const next = [...answers]
          next[currentQ] = e.target.value
          setAnswers(next)
        }}
      ></textarea>

      <div class="review-nav">
        <div class="review-nav-back" onClick=${handleBack}>‹</div>
        <div class="review-nav-next" onClick=${handleNext}>
          ${currentQ === questions.length - 1 ? 'Done' : 'Next'}
        </div>
      </div>
    </div>
  `
}

// ─── WeekCard ─────────────────────────────────────────────────────────────────

export default function WeekCard({
  periodKey,
  periodType,
  startDate,
  endDate,
  label,
  isThisPeriod,
  isOpen,
  view,
  onToggle,
  isReviewing,
  onReviewThisWeek,
  onStartReview,
  onReviewComplete,
}) {
  const [isEditing,    setIsEditing]    = React.useState(false)
  const [isEditReview, setIsEditReview] = React.useState(false)
  const [localVersion, setLocalVersion] = React.useState(0)

  const isWeek    = periodType === 'week'
  const intention = isWeek ? getWeeklyIntention(periodKey) : getMonthlyIntention(periodKey)
  const review    = isWeek ? getWeeklyReview(periodKey)    : getMonthlyReview(periodKey)

  function getReviewStatus() {
    if (review) return 'done'
    const todayStr = new Date().toISOString().split('T')[0]
    return todayStr > endDate ? 'pending' : 'not-yet'
  }

  const reviewStatus = getReviewStatus()

  function handleToggle() {
    if (isOpen) {
      setIsEditing(false)
      setIsEditReview(false)
    }
    onToggle(periodKey)
  }

  function handleIntentionSaved() {
    setIsEditing(false)
    setLocalVersion(v => v + 1)
  }

  function handleReviewFormComplete() {
    setIsEditReview(false)
    setLocalVersion(v => v + 1)
    onReviewComplete(periodKey)
  }

  // ─── Collapsed header ──────────────────────────────────────────────────────

  const arrow = html`<span class=${`collapse-arrow${isOpen ? ' open' : ''}`}>›</span>`

  let collapsedContent
  if (view === 'reviews') {
    collapsedContent = html`
      <div style=${{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
        <span class=${`review-status status-${reviewStatus}`}>
          ${reviewStatus === 'done' ? 'Done' : reviewStatus === 'pending' ? 'Pending' : 'Not yet'}
        </span>
        ${arrow}
      </div>
    `
  } else {
    collapsedContent = html`
      ${intention
        ? html`<span class="week-snippet">"${intention.sentence}"</span>`
        : html`<span class="week-no-intention">No intention set</span>`
      }
      ${arrow}
    `
  }

  // ─── Expanded content ──────────────────────────────────────────────────────

  let expandedContent = null
  if (isOpen) {
    if (view === 'intentions') {
      if (isEditing) {
        expandedContent = html`
          <div class="card-divider"></div>
          <${IntentionEdit}
            periodKey=${periodKey}
            periodType=${periodType}
            startDate=${startDate}
            endDate=${endDate}
            intention=${intention}
            onCancel=${() => setIsEditing(false)}
            onSaved=${handleIntentionSaved}
          />
        `
      } else if (intention) {
        expandedContent = html`
          <div class="card-divider"></div>
          <${IntentionView}
            intention=${intention}
            periodKey=${periodKey}
            periodType=${periodType}
            endDate=${endDate}
            onStartEdit=${() => setIsEditing(true)}
            onReviewThisWeek=${onReviewThisWeek}
            localVersion=${localVersion}
            setLocalVersion=${setLocalVersion}
          />
        `
      } else {
        expandedContent = html`
          <div class="card-divider"></div>
          <div class="week-card-expanded" style=${{ padding: '12px 16px 14px' }}>
            <div class="amber-btn" onClick=${() => setIsEditing(true)}>
              ${isWeek ? 'Set intention for this week' : 'Set intention for this month'}
            </div>
          </div>
        `
      }
    } else {
      // reviews view
      if (isReviewing || isEditReview) {
        const existingAnswers = review?.answers || review?.responses?.answers || null
        expandedContent = html`
          <div class="card-divider"></div>
          <div class="week-card-expanded">
            <${ReviewForm}
              periodKey=${periodKey}
              periodType=${periodType}
              intention=${intention}
              existingAnswers=${isEditReview ? existingAnswers : null}
              onComplete=${handleReviewFormComplete}
              onCancel=${() => {
                setIsEditReview(false)
                onReviewComplete(periodKey)
              }}
            />
          </div>
        `
      } else if (reviewStatus === 'done') {
        // Support both new flat structure and old responses-wrapped structure
        const insights = review?.insights || review?.responses?.insights || []
        const moodWord = review?.moodWord || review?.responses?.moodWord || null
        expandedContent = html`
          <div class="card-divider"></div>
          <div class="week-card-expanded">
            <div class="insight-list">
              ${insights.map((insight, i) => html`
                <div key=${i} class="insight-item">
                  <span class="insight-star">✦</span>
                  <div class="insight-text">${insight}</div>
                </div>
              `)}
            </div>
            ${moodWord && html`<div class="mood-word">"${moodWord}"</div>`}
            <${SimpleButton} label="Edit review" onClick=${() => setIsEditReview(true)} />
          </div>
        `
      } else if (reviewStatus === 'pending') {
        expandedContent = html`
          <div class="card-divider"></div>
          <div class="week-card-expanded">
            <div style=${{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '16px',
              fontStyle: 'italic',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              marginBottom: '16px',
            }}>
              ${isWeek
                ? '"The week has passed. Vera will read what you shared and put together a few thoughts."'
                : '"The month has passed. Vera will read what you shared and reflect back what she noticed."'
              }
            </div>
            <div class="amber-btn" onClick=${() => onStartReview(periodKey)}>Begin review</div>
          </div>
        `
      } else {
        expandedContent = html`
          <div class="card-divider"></div>
          <div class="week-card-expanded">
            <div style=${{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '16px',
              fontStyle: 'italic',
              color: 'var(--text-dim)',
              opacity: 0.5,
              lineHeight: 1.6,
            }}>
              ${isWeek
                ? '"This week isn\'t over yet. Come back when it is."'
                : '"This month isn\'t over yet. Come back when it is."'
              }
            </div>
          </div>
        `
      }
    }
  }

  return html`
    <div class="week-card">
      <div class="week-card-collapsed" onClick=${handleToggle}>
        <div class="week-left">
          <span class="week-date-range">${label}</span>
          ${isThisPeriod && html`
            <span class="week-badge badge-this">${isWeek ? 'This week' : 'This month'}</span>
          `}
        </div>
        ${collapsedContent}
      </div>
      ${expandedContent}
    </div>
  `
}
