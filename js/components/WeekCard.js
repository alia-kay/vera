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

const MONTH_NAMES_FULL = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
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

// ─── Intention edit form ──────────────────────────────────────────────────────

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
    if (periodType === 'week') saveWeeklyIntention(periodKey, data)
    else saveMonthlyIntention(periodKey, data)
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

// ─── Review form ──────────────────────────────────────────────────────────────

function ReviewForm({ periodKey, periodType, intention, existingAnswers, onComplete, onCancel }) {
  const isMonthly = periodType === 'month'
  const questions = isMonthly ? MONTHLY_QUESTIONS : WEEKLY_QUESTIONS

  const [answers,    setAnswers]    = React.useState(existingAnswers || Array(questions.length).fill(''))
  const [currentQ,   setCurrentQ]   = React.useState(0)
  const [generating, setGenerating] = React.useState(false)

  function handleNext() {
    if (currentQ < questions.length - 1) setCurrentQ(q => q + 1)
    else handleDone()
  }

  function handleBack() {
    if (currentQ > 0) setCurrentQ(q => q - 1)
    else onCancel()
  }

  async function handleDone() {
    setGenerating(true)
    try {
      const result = await generateWeeklyReview(answers, questions, intention, isMonthly)
      const reviewData = { questions, answers, insights: result.insights, moodWord: result.moodWord }
      if (!isMonthly) saveWeeklyReview(periodKey, reviewData)
      else saveMonthlyReview(periodKey, reviewData)
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
  periodKey, periodType, startDate, endDate, label,
  variant = 'hist',
  view,
  isThisPeriod,
  isOpen, onToggle,
  isReviewing, onStartReview, onReviewComplete,
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

  const [, pMonthNum] = periodKey.split('-').map(Number)
  const pMonthName    = MONTH_NAMES_FULL[(pMonthNum || 1) - 1] || ''

  function getCardPeriodLabel() {
    if (isWeek) {
      if (isThisPeriod) return 'This week'
      const endD    = new Date(endDate + 'T00:00:00')
      const daysAgo = (new Date() - endD) / 86400000
      if (daysAgo >= 1 && daysAgo <= 8) return 'Last week'
      return ''
    }
    return isThisPeriod ? `This month · ${pMonthName}` : `${pMonthName} · Month`
  }
  const cardPeriodLabel = getCardPeriodLabel()

  function handleIntentionSaved() {
    setIsEditing(false)
    setLocalVersion(v => v + 1)
  }

  function handleReviewFormComplete() {
    setIsEditReview(false)
    setLocalVersion(v => v + 1)
    if (onReviewComplete) onReviewComplete()
  }

  function toggleItem(itemId, checked) {
    if (isWeek) updateWeeklyIntentionItem(periodKey, itemId, checked)
    else updateMonthlyIntentionItem(periodKey, itemId, checked)
    setLocalVersion(v => v + 1)
  }

  // ─── Intention body (used in all card styles) ─────────────────────────────

  function renderIntentionBody(inCard) {
    if (isEditing) {
      return html`
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
    }

    if (intention) {
      return html`
        ${inCard
          ? html`<div class="card-sentence">"${intention.sentence}"</div>`
          : html`
            <div class="intention-header">
              <div class="intention-sentence">"${intention.sentence}"</div>
              <${SimpleButton}
                label="Edit"
                style=${{ width: 'auto', padding: '5px 10px' }}
                onClick=${() => setIsEditing(true)}
              />
            </div>
          `
        }
        ${isWeek && (intention.items || []).length > 0 && html`
          <div class="checklist">
            ${(intention.items || []).map(item => html`
              <${CheckItem}
                key=${item.id}
                item=${item}
                onToggle=${toggleItem}
                editMode=${false}
              />
            `)}
          </div>
        `}
        ${(intention.focusWords || []).length > 0 && html`
          <div class="focus-pills">
            ${(intention.focusWords || []).map(w => html`<div key=${w} class="focus-pill">${w}</div>`)}
          </div>
        `}
        ${inCard && !isWeek && html`<div style=${{ height: '4px' }}></div>`}
      `
    }

    // No intention set
    return html`
      <div class="card-empty">
        ${isWeek ? 'No intention set for this week.' : `No intention set for ${pMonthName} yet.`}
      </div>
      <div class="amber-btn" onClick=${() => setIsEditing(true)}>
        ${isWeek ? 'Set intention for this week' : 'Set intention for this month'}
      </div>
    `
  }

  // ─── Review body ──────────────────────────────────────────────────────────

  function renderReviewBody() {
    if (isReviewing || isEditReview) {
      const existingAnswers = review?.answers || review?.responses?.answers || null
      return html`
        <${ReviewForm}
          periodKey=${periodKey}
          periodType=${periodType}
          intention=${intention}
          existingAnswers=${isEditReview ? existingAnswers : null}
          onComplete=${handleReviewFormComplete}
          onCancel=${() => {
            setIsEditReview(false)
            if (onReviewComplete) onReviewComplete()
          }}
        />
      `
    }

    if (reviewStatus === 'done') {
      const insights = review?.insights || review?.responses?.insights || []
      const moodWord = review?.moodWord || review?.responses?.moodWord || null
      return html`
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
      `
    }

    if (reviewStatus === 'pending') {
      return html`
        <div style=${{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '16px',
          color: 'var(--text-muted)',
          lineHeight: 1.6,
          marginBottom: '16px',
        }}>
          ${isWeek
            ? '"The week has passed. Vera will read what you shared and put together a few thoughts."'
            : '"The month has passed. Vera will read what you shared and reflect back what she noticed."'
          }
        </div>
        <div class="amber-btn" onClick=${() => onStartReview && onStartReview(periodKey)}>Begin review</div>
      `
    }

    return html`
      <div style=${{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: '16px',
        color: 'var(--text-dim)',
        opacity: 0.5,
        lineHeight: 1.6,
      }}>
        ${isWeek
          ? '"This week isn\'t over yet. Come back when it is."'
          : '"This month isn\'t over yet. Come back when it is."'
        }
      </div>
    `
  }

  // ─── Render: primary ──────────────────────────────────────────────────────

  if (variant === 'primary') {
    if (view === 'intentions') {
      return html`
        <div class="week-card-primary">
          ${intention && !isEditing && html`
            <button class="edit-btn" onClick=${() => setIsEditing(true)}>Edit</button>
          `}
          ${cardPeriodLabel && html`<div class="card-period">${cardPeriodLabel}</div>`}
          <div class="card-daterange">${label}</div>
          ${renderIntentionBody(true)}
        </div>
      `
    }

    return html`
      <div class="review-card-open">
        <div class="review-card-header">
          <div>
            ${cardPeriodLabel && html`<div class="card-period" style=${{ marginBottom: '3px' }}>${cardPeriodLabel}</div>`}
            <div class="card-daterange" style=${{ marginBottom: 0 }}>${label}</div>
          </div>
          <span class=${`review-status status-${reviewStatus}`}>
            ${reviewStatus === 'done' ? 'Done' : reviewStatus === 'pending' ? 'Pending' : 'Not yet'}
          </span>
        </div>
        ${renderReviewBody()}
      </div>
    `
  }

  // ─── Render: secondary ────────────────────────────────────────────────────

  if (variant === 'secondary') {
    return html`
      <div class="month-card-secondary">
        ${intention && !isEditing && html`
          <button class="edit-btn" onClick=${() => setIsEditing(true)}>Edit</button>
        `}
        ${cardPeriodLabel && html`<div class="card-period">${cardPeriodLabel}</div>`}
        ${renderIntentionBody(true)}
      </div>
    `
  }

  // ─── Render: hist ─────────────────────────────────────────────────────────

  const intentionSnippet = intention?.sentence
  const reviewMoodWord   = review?.moodWord || review?.responses?.moodWord

  const histSnippet = view === 'intentions'
    ? (intentionSnippet ? `"${intentionSnippet}"` : 'No intention set')
    : (reviewMoodWord ? `"${reviewMoodWord}"` : '')

  const snippetFaded = view === 'intentions' && !intentionSnippet

  return html`
    <div class="hist-row" style=${{ borderBottom: isOpen ? 'none' : undefined }} onClick=${() => onToggle && onToggle(periodKey)}>
      <div class="hist-left">
        <div class="hist-date">${label}</div>
        <div class="hist-snippet" style=${{ opacity: snippetFaded ? 0.25 : undefined }}>
          ${histSnippet}
        </div>
      </div>
      <div class="hist-right">
        <div class=${`type-pill ${isWeek ? 'type-pill-week' : 'type-pill-month'}`}>
          ${isWeek ? 'Week' : 'Month'}
        </div>
        ${view === 'reviews' && html`
          <span class=${`review-status status-${reviewStatus}`} style=${{ fontSize: '7px', padding: '2px 6px' }}>
            ${reviewStatus === 'done' ? 'Done' : reviewStatus === 'pending' ? 'Pending' : 'Not yet'}
          </span>
        `}
        <div class="hist-arrow" style=${{
          transform: isOpen ? 'rotate(90deg)' : 'none',
          transition: 'transform 0.2s ease',
        }}>›</div>
      </div>
    </div>
  `
}
