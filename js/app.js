import htm from 'https://unpkg.com/htm?module'
import Header from './components/Header.js'
import BottomNav from './components/BottomNav.js'
import ShareTab from './tabs/Share.js'
import IntendTab from './tabs/Intend.js'
import RememberTab from './tabs/Remember.js'
import GrowTab from './tabs/Grow.js'
import Onboarding from './onboarding/Onboarding.js'

// Storage import ensures migrations run before any component renders
import * as storageLib from './lib/storage.js'

const html = htm.bind(React.createElement)

const TABS = {
  share:    ShareTab,
  intend:   IntendTab,
  remember: RememberTab,
  grow:     GrowTab,
}

function MainApp() {
  const [activeTab, setActiveTab] = React.useState('share')
  const TabComponent = TABS[activeTab]

  // Share tab manages its own layout and bottom nav (InputBar contains both)
  if (activeTab === 'share') {
    return html`
      <div style=${{ position: 'relative', minHeight: '100dvh' }}>
        <div class="atmos"></div>
        <${Header} />
        <${TabComponent} setActiveTab=${setActiveTab} />
      </div>
    `
  }

  return html`
    <div style=${{ position: 'relative', minHeight: '100dvh' }}>
      <div class="atmos"></div>
      <${Header} />
      <main class="content-area">
        <div class="tab-content" key=${activeTab}>
          <${TabComponent} />
        </div>
      </main>
      <${BottomNav} activeTab=${activeTab} setActiveTab=${setActiveTab} />
    </div>
  `
}

function App() {
  const [onboardingDone, setOnboardingDone] = React.useState(
    () => storageLib.isOnboardingComplete()
  )

  if (!onboardingDone) {
    return html`<${Onboarding} onComplete=${() => setOnboardingDone(true)} />`
  }

  return html`<${MainApp} />`
}

const root = ReactDOM.createRoot(document.getElementById('app'))
root.render(html`<${App} />`)

// DEV ONLY — remove before shipping
window.veraTest = {
  storage: storageLib,
  resetOnboarding: () => {
    storageLib.updateUserProfile({ onboardingComplete: false })
    window.location.reload()
  },
  seed: () => {
    const today = storageLib.getTodayString()
    const yesterday = (() => {
      const d = new Date()
      d.setDate(d.getDate() - 1)
      return d.toISOString().split('T')[0]
    })()

    storageLib.saveEntry(yesterday, {
      id: storageLib.generateId(),
      createdAt: new Date(yesterday).toISOString(),
      userText: "I couldn't sleep again last night. Woke up anxious, mind racing about the presentation. Felt exhausted all day and a bit disconnected from everyone.",
      aiResponse: "That kind of night leaves a particular residue — the tiredness isn't just physical, it mixes with everything you're already carrying. What's sitting heaviest about the presentation right now?",
      mood: 2,
      detectedSymptoms: [
        { domain: 'sleep', keyword: "couldn't sleep", userPhrase: "i couldn't sleep again last night" },
        { domain: 'emotional_distress', keyword: 'anxious', userPhrase: 'woke up anxious, mind racing about the presentation' },
        { domain: 'energy_fatigue', keyword: 'exhausted', userPhrase: 'felt exhausted all day and a bit disconnected' }
      ],
      detectedThemes: ['sleep', 'anxiety', 'work'],
      freeTags: []
    })

    storageLib.saveEntry(today, {
      id: storageLib.generateId(),
      createdAt: new Date().toISOString(),
      userText: "Better today. The presentation went fine. Still a bit tired but the dread is gone.",
      aiResponse: "There's something worth sitting with in that gap — between the dread you felt last night and the fine that followed. What do you think was actually driving the anxiety?",
      mood: 4,
      detectedSymptoms: [
        { domain: 'energy_fatigue', keyword: 'tired', userPhrase: 'still a bit tired but the dread is gone' }
      ],
      detectedThemes: ['work', 'relief'],
      freeTags: []
    })

    const weekKey = storageLib.getWeekKey(new Date())
    storageLib.saveWeeklyIntention(weekKey, {
      sentence: 'Show up fully this week without bracing for what might go wrong.',
      focusWord: 'presence',
      items: [
        { id: storageLib.generateId(), text: 'Write in Vera each morning', checked: false, createdAt: new Date().toISOString() },
        { id: storageLib.generateId(), text: 'Leave work by 6pm', checked: true, createdAt: new Date().toISOString() }
      ]
    })

    console.log('Vera: seed data written.', storageLib.exportAllData())
  }
}
