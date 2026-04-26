// Symptom keyword scanner — synchronous, no AI, no external dependencies

const SYMPTOM_DOMAINS = {
  physical_pain: {
    label: 'Physical pain',
    keywords: [
      'migraine', 'headache', 'head hurts', 'head is pounding',
      'back pain', 'neck pain', 'jaw', 'chest tight', 'chest pain',
      'stomach ache', 'nausea', 'nauseous', 'cramps', 'pain'
    ]
  },
  energy_fatigue: {
    label: 'Energy & fatigue',
    keywords: [
      'exhausted', 'drained', 'tired', 'heavy', 'foggy', 'no energy',
      'running on empty', 'depleted', 'burnt out', 'burned out',
      "can't get up", 'just surviving', 'barely functioning'
    ]
  },
  sleep: {
    label: 'Sleep',
    keywords: [
      "couldn't sleep", 'poor sleep', 'bad sleep', 'up all night',
      'woke up', 'insomnia', 'nightmare', 'broken sleep',
      "didn't sleep", 'exhausted from not sleeping', 'restless'
    ]
  },
  emotional_distress: {
    label: 'Emotional distress',
    keywords: [
      'anxious', 'anxiety', 'panic', 'panicking', 'dread', 'spiralling',
      'spiraling', 'overwhelmed', "can't cope", 'falling apart',
      'heart racing', "can't breathe", 'doom', 'terrified', 'scared'
    ]
  },
  anger_suppression: {
    label: 'Anger & suppression',
    keywords: [
      'angry', 'anger', 'furious', 'rage', 'resentment', 'resentful',
      'swallowed it', 'held it in', 'bit my tongue', "didn't say anything",
      'stayed quiet', 'said nothing', 'kept it to myself', 'suppressed',
      'boiling', 'seething', 'frustrated'
    ]
  },
  mood_low: {
    label: 'Low mood',
    keywords: [
      'sad', 'sadness', 'flat', 'numb', 'hollow', 'empty',
      'disconnected', 'depressed', 'depression', 'hopeless',
      'grey', 'nothing matters', 'crying', 'cried', 'tears',
      "don't care", 'unmotivated', 'lost'
    ]
  },
  cognitive: {
    label: 'Cognitive',
    keywords: [
      "can't focus", "can't concentrate", 'foggy', 'scattered',
      'racing thoughts', "mind won't stop", 'overthinking',
      'forgetful', 'brain fog', "can't think", 'distracted',
      'mind is everywhere'
    ]
  },
  physical_tension: {
    label: 'Physical tension',
    keywords: [
      'tense', 'tension', 'tight', 'clenched', 'bracing',
      'holding it', 'carrying it in my body', 'shoulders',
      'jaw tight', 'grinding teeth', 'hunched', 'stiff'
    ]
  },
  appetite_body: {
    label: 'Appetite & body',
    keywords: [
      'not hungry', 'no appetite', 'eating too much', 'stress eating',
      'nauseous', 'stomach', 'queasy', 'bloated', 'heavy in my body'
    ]
  },
  social_relational: {
    label: 'Social & relational',
    keywords: [
      'lonely', 'alone', 'invisible', 'unheard', 'misunderstood',
      'disconnected', 'nobody gets it', 'isolated', 'left out',
      'ignored', 'overlooked', 'not seen'
    ]
  },
  self_worth: {
    label: 'Self-worth',
    keywords: [
      'not good enough', 'impostor', 'imposter', 'fraud', 'failure',
      'worthless', 'hate myself', 'ashamed', 'embarrassed', 'stupid',
      'incompetent', 'useless', 'who am i to', "don't deserve"
    ]
  }
}

// Scans free text for symptom keywords
// Returns { detected: [{ domain, keyword, userPhrase }], freeTags: [] }
export function scanForSymptoms(text) {
  const lower = text.toLowerCase()
  const sentences = lower.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const detected = []
  const seen = new Set()

  for (const sentence of sentences) {
    for (const [domain, config] of Object.entries(SYMPTOM_DOMAINS)) {
      for (const keyword of config.keywords) {
        if (sentence.includes(keyword) && !seen.has(keyword)) {
          seen.add(keyword)
          detected.push({
            domain,
            keyword,
            userPhrase: sentence.trim().slice(0, 80)
          })
        }
      }
    }
  }

  return { detected, freeTags: [] }
}

export { SYMPTOM_DOMAINS }
