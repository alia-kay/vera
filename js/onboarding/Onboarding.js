import htm from 'https://unpkg.com/htm?module'
import Welcome from './screens/Welcome.js'
import QuestionOne from './screens/QuestionOne.js'
import QuestionTwo from './screens/QuestionTwo.js'
import FocusAreas from './screens/FocusAreas.js'
import FirstIntention from './screens/FirstIntention.js'
import {
  saveUserProfile, saveWeeklyIntention,
  getWeekKey, getTodayString, generateId
} from '../lib/storage.js'

const html = htm.bind(React.createElement)

function detectBranch(text) {
  const lower = text.toLowerCase()
  const careerKeywords = [
    'work', 'job', 'career', 'professional', 'role', 'company',
    'colleague', 'boss', 'manager', 'promotion', 'salary',
    'industry', 'startup', 'office', 'project', 'team', 'meeting',
    'pm', 'product', 'design', 'developer', 'engineer'
  ]
  const emotionalKeywords = [
    'feel', 'feeling', 'emotion', 'sad', 'anxious', 'anxiety',
    'depressed', 'lonely', 'anger', 'angry', 'overwhelmed',
    'stressed', 'exhausted', 'lost', 'relationship', 'partner',
    'family', 'grief', 'hurt', 'afraid', 'scared'
  ]
  const careerScore    = careerKeywords.filter(k => lower.includes(k)).length
  const emotionalScore = emotionalKeywords.filter(k => lower.includes(k)).length

  if (careerScore >= emotionalScore && careerScore > 0) return 'career'
  if (emotionalScore > 0) return 'emotional'
  return 'neutral'
}

function completeOnboarding(formData) {
  saveUserProfile({
    name: formData.name.trim() || null,
    focusAreas: formData.focusAreas,
    dayOneContext: [formData.q1Answer, formData.q2Answer].filter(Boolean).join(' '),
    totalEntries: 0,
    firstEntryDate: null,
    onboardingComplete: true,
    createdAt: new Date().toISOString()
  })

  if (formData.firstIntention.trim()) {
    const today = new Date()
    const weekKey = getWeekKey(today)
    const todayStr = getTodayString()
    // Compute Monday and Sunday of the current ISO week
    const day = today.getDay() || 7
    const monday = new Date(today)
    monday.setDate(today.getDate() - (day - 1))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const startDate = monday.toISOString().split('T')[0]
    const endDate   = sunday.toISOString().split('T')[0]

    saveWeeklyIntention(weekKey, {
      weekKey,
      startDate,
      endDate,
      sentence: formData.firstIntention.trim(),
      focusWord: null,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }
}

export default function Onboarding({ onComplete }) {
  const [screen, setScreen]     = React.useState(1)
  const [formData, setFormData] = React.useState({
    name: '',
    q1Answer: '',
    q2Answer: '',
    q2Branch: 'neutral',
    focusAreas: [],
    firstIntention: ''
  })

  function go(nextScreen, updates = {}) {
    setFormData(prev => ({ ...prev, ...updates }))
    setScreen(nextScreen)
  }

  function handleWelcomeNext(name) {
    go(2, { name })
  }

  function handleQ1Next(q1Answer) {
    go(3, { q1Answer, q2Branch: detectBranch(q1Answer) })
  }

  function handleQ1Skip() {
    go(3, { q1Answer: '', q2Branch: 'neutral' })
  }

  function handleQ2Next(q2Answer) {
    go(4, { q2Answer })
  }

  function handleQ2Skip() {
    go(4, { q2Answer: '' })
  }

  function handleFocusNext(focusAreas) {
    go(5, { focusAreas })
  }

  function handleFocusSkip() {
    go(5, { focusAreas: [] })
  }

  function handleIntentionComplete(firstIntention) {
    const finalData = { ...formData, firstIntention }
    completeOnboarding(finalData)
    onComplete()
  }

  function handleIntentionSkip() {
    completeOnboarding(formData)
    onComplete()
  }

  switch (screen) {
    case 1: return html`<${Welcome}
      onNext=${handleWelcomeNext}
    />`
    case 2: return html`<${QuestionOne}
      initialValue=${formData.q1Answer}
      onBack=${() => setScreen(1)}
      onNext=${handleQ1Next}
    />`
    case 3: return html`<${QuestionTwo}
      branch=${formData.q2Branch}
      initialValue=${formData.q2Answer}
      onBack=${() => setScreen(2)}
      onNext=${handleQ2Next}
    />`
    case 4: return html`<${FocusAreas}
      initialSelected=${formData.focusAreas}
      onBack=${() => setScreen(3)}
      onNext=${handleFocusNext}
    />`
    case 5: return html`<${FirstIntention}
      initialValue=${formData.firstIntention}
      onBack=${() => setScreen(4)}
      onComplete=${handleIntentionComplete}
    />`
  }
}
