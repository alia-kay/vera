import { runMigrations } from './migrations.js'
import { scanForSymptoms } from './scanner.js'

// Run immediately when this module loads — data is always in current schema
// shape before any read/write calls happen
runMigrations()

// ─── Utilities ───────────────────────────────────────────────────────────────

export function getTodayString() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function clearAllData() {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('vera_'))
    keys.forEach(k => localStorage.removeItem(k))
  } catch(e) {
    console.error('Vera: clearAllData failed:', e)
  }
}

export function exportAllData() {
  try {
    const result = {}
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('vera_')) {
        try {
          result[key] = JSON.parse(localStorage.getItem(key))
        } catch {
          result[key] = localStorage.getItem(key)
        }
      }
    }
    return result
  } catch(e) {
    console.error('Vera: exportAllData failed:', e)
    return {}
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch(e) {
    if (window.VERA_DEBUG) console.log(`Vera: readJSON failed for ${key}:`, e)
    return fallback
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch(e) {
    console.error(`Vera: writeJSON failed for ${key}:`, e)
    return false
  }
}

// ─── User profile ─────────────────────────────────────────────────────────────

const DEFAULT_PROFILE = {
  name: null,
  focusAreas: [],
  dayOneContext: '',
  totalEntries: 0,
  firstEntryDate: null,
  onboardingComplete: false,
  createdAt: new Date().toISOString()
}

export function getUserProfile() {
  return readJSON('vera_user_profile', { ...DEFAULT_PROFILE })
}

export function saveUserProfile(profile) {
  writeJSON('vera_user_profile', profile)
}

export function updateUserProfile(partial) {
  const current = getUserProfile()
  writeJSON('vera_user_profile', { ...current, ...partial })
}

export function isOnboardingComplete() {
  return getUserProfile().onboardingComplete === true
}

// ─── Entries ──────────────────────────────────────────────────────────────────

export function getEntriesForDate(dateString) {
  return readJSON(`vera_entries_${dateString}`, [])
}

export function saveEntry(dateString, entry) {
  try {
    const entries = getEntriesForDate(dateString)
    entries.push(entry)
    writeJSON(`vera_entries_${dateString}`, entries)

    const profile = getUserProfile()
    const isFirst = profile.totalEntries === 0
    updateUserProfile({
      totalEntries: profile.totalEntries + 1,
      firstEntryDate: isFirst ? dateString : profile.firstEntryDate
    })

    if (entry.mood != null) {
      saveMoodForDate(dateString, entry.mood)
    }

    if (entry.detectedSymptoms && entry.detectedSymptoms.length > 0) {
      for (const s of entry.detectedSymptoms) {
        appendOccurrence({
          date: dateString,
          entryId: entry.id,
          domain: s.domain,
          keyword: s.keyword,
          userPhrase: s.userPhrase || null
        })
      }
    }

    return true
  } catch(e) {
    console.error('Vera: saveEntry failed:', e)
    return false
  }
}

export function getRecentEntries(n) {
  try {
    const results = []
    const today = new Date()

    for (let i = 0; i < 90 && results.length < n; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const entries = getEntriesForDate(dateStr)
      for (let j = entries.length - 1; j >= 0 && results.length < n; j--) {
        results.push(entries[j])
      }
    }

    return results
  } catch(e) {
    console.error('Vera: getRecentEntries failed:', e)
    return []
  }
}

export function getTotalEntryCount() {
  return getUserProfile().totalEntries || 0
}

export function getEntryById(id) {
  try {
    const today = new Date()
    for (let i = 0; i < 90; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const entries = getEntriesForDate(dateStr)
      const found = entries.find(e => e.id === id)
      if (found) return found
    }
    return null
  } catch(e) {
    console.error('Vera: getEntryById failed:', e)
    return null
  }
}

// ─── Mood ─────────────────────────────────────────────────────────────────────

export function getMoodForDate(dateString) {
  return readJSON(`vera_mood_${dateString}`, null)
}

export function saveMoodForDate(dateString, mood) {
  writeJSON(`vera_mood_${dateString}`, mood)
}

export function getMoodForMonth(year, month) {
  try {
    const result = {}
    const daysInMonth = new Date(year, month, 0).getDate()
    const mm = String(month).padStart(2, '0')
    for (let d = 1; d <= daysInMonth; d++) {
      const dd = String(d).padStart(2, '0')
      const dateStr = `${year}-${mm}-${dd}`
      const mood = getMoodForDate(dateStr)
      if (mood != null) result[dateStr] = mood
    }
    return result
  } catch(e) {
    console.error('Vera: getMoodForMonth failed:', e)
    return {}
  }
}

// ─── Symptoms and patterns ────────────────────────────────────────────────────

const DEFAULT_PATTERN_DATA = {
  occurrences: [],
  trackedPatterns: [],
  customPatterns: [],
  lastUpdated: null
}

export function getPatternData() {
  return readJSON('vera_patterns', { ...DEFAULT_PATTERN_DATA })
}

export function savePatternData(data) {
  writeJSON('vera_patterns', { ...data, lastUpdated: new Date().toISOString() })
}

export function appendOccurrence(occurrence) {
  try {
    const data = getPatternData()
    data.occurrences.push(occurrence)
    savePatternData(data)
    checkAndElevatePattern(occurrence.keyword, occurrence.domain, data)
  } catch(e) {
    console.error('Vera: appendOccurrence failed:', e)
  }
}

function checkAndElevatePattern(keyword, domain, data) {
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  const cutoff = fourteenDaysAgo.toISOString().split('T')[0]

  const recentCount = data.occurrences.filter(
    o => o.keyword === keyword && o.date >= cutoff
  ).length

  if (recentCount >= 3) {
    elevatePattern(keyword, domain)
  }
}

export function elevatePattern(keyword, domain) {
  try {
    const data = getPatternData()
    const existing = data.trackedPatterns.find(p => p.name === keyword)
    if (existing) return

    const all = data.occurrences.filter(o => o.keyword === keyword)
    const dates = all.map(o => o.date).sort()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoff = thirtyDaysAgo.toISOString().split('T')[0]

    data.trackedPatterns.push({
      id: generateId(),
      name: keyword,
      domain,
      firstSeen: dates[0] || getTodayString(),
      lastSeen: dates[dates.length - 1] || getTodayString(),
      totalCount: all.length,
      recentCount: all.filter(o => o.date >= cutoff).length,
      source: 'keyword_scan',
      isTracked: true
    })

    savePatternData(data)
  } catch(e) {
    console.error('Vera: elevatePattern failed:', e)
  }
}

export function addCustomPattern(name, domain = 'custom') {
  try {
    const data = getPatternData()
    const exists = data.trackedPatterns.some(
      p => p.name.toLowerCase() === name.toLowerCase()
    )
    if (exists) return
    data.trackedPatterns.push({
      id: generateId(),
      name,
      domain: domain || 'custom',
      firstSeen: getTodayString(),
      lastSeen: getTodayString(),
      totalCount: 0,
      recentCount: 0,
      source: 'user_requested',
      isTracked: true,
    })
    savePatternData(data)
  } catch(e) {
    console.warn('addCustomPattern failed:', e)
  }
}

// Scans occurrences from the last 14 days.
// Any keyword that appears 3+ times gets promoted to trackedPatterns.
// Safe to call after every entry save — skips already-tracked patterns.
export function elevatePatterns() {
  try {
    const data = getPatternData()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 14)
    const cutoffStr = cutoff.toISOString().split('T')[0]

    const domainCounts = {}
    for (const occ of data.occurrences) {
      if (occ.date < cutoffStr) continue
      const key = occ.domain + '::' + occ.keyword
      if (!domainCounts[key]) {
        domainCounts[key] = { domain: occ.domain, keyword: occ.keyword, count: 0 }
      }
      domainCounts[key].count++
    }

    const existingNames = new Set(data.trackedPatterns.map(p => p.name.toLowerCase()))

    for (const entry of Object.values(domainCounts)) {
      if (entry.count < 3) continue
      if (existingNames.has(entry.keyword.toLowerCase())) continue

      data.trackedPatterns.push({
        id: generateId(),
        name: entry.keyword,
        domain: entry.domain,
        firstSeen: getTodayString(),
        lastSeen: getTodayString(),
        totalCount: entry.count,
        recentCount: entry.count,
        source: 'keyword_scan',
        isTracked: true,
      })

      existingNames.add(entry.keyword.toLowerCase())
    }

    savePatternData(data)
  } catch (err) {
    console.warn('elevatePatterns failed:', err)
  }
}

// Recomputes recentCount (last 30 days) and totalCount for every entry in
// trackedPatterns from the raw occurrences array.
// Call after every saveEntry() to keep counts accurate.
export function recomputePatternCounts() {
  try {
    const data = getPatternData()
    const cutoff30 = new Date()
    cutoff30.setDate(cutoff30.getDate() - 30)
    const cutoffStr = cutoff30.toISOString().split('T')[0]

    const totalCounts  = {}
    const recentCounts = {}
    const lastSeen     = {}

    for (const occ of data.occurrences) {
      const d = occ.domain
      totalCounts[d] = (totalCounts[d] || 0) + 1
      if (occ.date >= cutoffStr) {
        recentCounts[d] = (recentCounts[d] || 0) + 1
      }
      if (!lastSeen[d] || occ.date > lastSeen[d]) {
        lastSeen[d] = occ.date
      }
    }

    for (const custom of data.customPatterns) {
      const d = 'custom'
      totalCounts[d] = (totalCounts[d] || 0) + custom.loggedDates.length
      const recentDates = custom.loggedDates.filter(date => date >= cutoffStr)
      recentCounts[d] = (recentCounts[d] || 0) + recentDates.length
      if (custom.loggedDates.length > 0) {
        const latest = custom.loggedDates.slice().sort().at(-1)
        if (!lastSeen[d] || latest > lastSeen[d]) lastSeen[d] = latest
      }
    }

    data.trackedPatterns = data.trackedPatterns.map(p => ({
      ...p,
      totalCount:  totalCounts[p.domain]  || p.totalCount  || 0,
      recentCount: recentCounts[p.domain] || 0,
      lastSeen:    lastSeen[p.domain]     || p.lastSeen,
    }))

    data.lastUpdated = new Date().toISOString()
    savePatternData(data)
  } catch (err) {
    console.warn('recomputePatternCounts failed:', err)
  }
}

// Removes a pattern from trackedPatterns by id.
// Historical occurrences are preserved.
export function deleteTrackedPattern(patternId) {
  try {
    const data = getPatternData()
    data.trackedPatterns = data.trackedPatterns.filter(p => p.id !== patternId)
    savePatternData(data)
  } catch (err) {
    console.warn('deleteTrackedPattern failed:', err)
  }
}

export function logCustomPatternDate(patternId, date) {
  try {
    const data = getPatternData()
    const pattern = data.customPatterns.find(p => p.id === patternId)
    if (pattern && !pattern.loggedDates.includes(date)) {
      pattern.loggedDates.push(date)
      savePatternData(data)
    }
  } catch(e) {
    console.error('Vera: logCustomPatternDate failed:', e)
  }
}

export function getTrackedPatterns() {
  return getPatternData().trackedPatterns.filter(p => p.isTracked)
}

export function getPatternFrequency(domain, days) {
  try {
    const data = getPatternData()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    return data.occurrences.filter(o => o.domain === domain && o.date >= cutoffStr).length
  } catch(e) {
    console.error('Vera: getPatternFrequency failed:', e)
    return 0
  }
}

// ─── Week / month key helpers ─────────────────────────────────────────────────

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  return { year: d.getUTCFullYear(), week: String(weekNum).padStart(2, '0') }
}

export function getWeekKey(date) {
  const { year, week } = getISOWeek(date)
  return `${year}-${week}`
}

export function getMonthKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

// Returns the Monday of the ISO week containing the given date
function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - (day - 1))
  return d
}

// ─── Intentions ───────────────────────────────────────────────────────────────

export function getWeeklyIntention(weekKey) {
  return readJSON(`vera_intention_week_${weekKey}`, null)
}

export function saveWeeklyIntention(weekKey, intention) {
  const existing = getWeeklyIntention(weekKey)
  writeJSON(`vera_intention_week_${weekKey}`, {
    ...intention,
    weekKey,
    updatedAt: new Date().toISOString(),
    createdAt: existing ? existing.createdAt : new Date().toISOString()
  })
}

export function updateWeeklyIntentionItem(weekKey, itemId, checked) {
  try {
    const intention = getWeeklyIntention(weekKey)
    if (!intention) return
    intention.items = (intention.items || []).map(item =>
      item.id === itemId ? { ...item, checked } : item
    )
    saveWeeklyIntention(weekKey, intention)
  } catch(e) {
    console.error('Vera: updateWeeklyIntentionItem failed:', e)
  }
}

export function getMonthlyIntention(monthKey) {
  return readJSON(`vera_intention_month_${monthKey}`, null)
}

export function saveMonthlyIntention(monthKey, intention) {
  const existing = getMonthlyIntention(monthKey)
  writeJSON(`vera_intention_month_${monthKey}`, {
    ...intention,
    monthKey,
    updatedAt: new Date().toISOString(),
    createdAt: existing ? existing.createdAt : new Date().toISOString()
  })
}

export function updateMonthlyIntentionItem(monthKey, itemId, checked) {
  try {
    const intention = getMonthlyIntention(monthKey)
    if (!intention) return
    intention.items = (intention.items || []).map(item =>
      item.id === itemId ? { ...item, checked } : item
    )
    saveMonthlyIntention(monthKey, intention)
  } catch(e) {
    console.error('Vera: updateMonthlyIntentionItem failed:', e)
  }
}

export function getCurrentWeekIntention() {
  return getWeeklyIntention(getWeekKey(new Date()))
}

export function getCurrentMonthIntention() {
  return getMonthlyIntention(getMonthKey(new Date()))
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export function getWeeklyReview(weekKey) {
  return readJSON(`vera_review_week_${weekKey}`, null)
}

export function saveWeeklyReview(weekKey, data) {
  const existing = getWeeklyReview(weekKey)
  writeJSON(`vera_review_week_${weekKey}`, {
    ...(existing || {}),
    ...data,
    periodKey: weekKey,
  })
}

export function getMonthlyReview(monthKey) {
  return readJSON(`vera_review_month_${monthKey}`, null)
}

export function saveMonthlyReview(monthKey, data) {
  const existing = getMonthlyReview(monthKey)
  writeJSON(`vera_review_month_${monthKey}`, {
    ...(existing || {}),
    ...data,
    periodKey: monthKey,
  })
}

export function isWeeklyReviewDue(weekKey) {
  try {
    const [yearStr, weekStr] = weekKey.split('-')
    const year = parseInt(yearStr, 10)
    const week = parseInt(weekStr, 10)

    // Find the Sunday of that ISO week
    const jan4 = new Date(Date.UTC(year, 0, 4))
    const startOfWeek1 = new Date(jan4)
    startOfWeek1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1))
    const weekMonday = new Date(startOfWeek1)
    weekMonday.setUTCDate(startOfWeek1.getUTCDate() + (week - 1) * 7)
    const weekSunday = new Date(weekMonday)
    weekSunday.setUTCDate(weekMonday.getUTCDate() + 6)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return today > weekSunday && !getWeeklyReview(weekKey)
  } catch(e) {
    return false
  }
}

export function isMonthlyReviewDue(monthKey) {
  try {
    const [yearStr, monthStr] = monthKey.split('-')
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)
    const lastDay = new Date(year, month, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today > lastDay && !getMonthlyReview(monthKey)
  } catch(e) {
    return false
  }
}

// ─── Learning log ─────────────────────────────────────────────────────────────

export function getLearningLog() {
  return readJSON('vera_learning_log', { items: [] }).items
}

export function addLearningItem(item) {
  try {
    const log = readJSON('vera_learning_log', { items: [] })
    log.items.push({ ...item, id: item.id || generateId() })
    writeJSON('vera_learning_log', log)
  } catch(e) {
    console.error('Vera: addLearningItem failed:', e)
  }
}

export function updateLearningItem(id, partial) {
  try {
    const log = readJSON('vera_learning_log', { items: [] })
    log.items = log.items.map(item => item.id === id ? { ...item, ...partial } : item)
    writeJSON('vera_learning_log', log)
  } catch(e) {
    console.error('Vera: updateLearningItem failed:', e)
  }
}

export function deleteLearningItem(id) {
  try {
    const log = readJSON('vera_learning_log', { items: [] })
    log.items = log.items.filter(item => item.id !== id)
    writeJSON('vera_learning_log', log)
  } catch(e) {
    console.error('Vera: deleteLearningItem failed:', e)
  }
}

export function getRecentLearningItems(n) {
  return getLearningLog().slice(-n).reverse()
}

export function getLearningItemsByType(type) {
  return getLearningLog().filter(item => item.type === type)
}

// ─── Grow tab ─────────────────────────────────────────────────────────────────

const DEFAULT_GROW_DATA = {
  items: [],
  suggestion: null,
  notice: null,
  addCounter: 0,
  nextNoticeAt: 2,
  pendingNoticeGeneration: false,
}

export function getGrowData() {
  const data = readJSON('vera_grow', { ...DEFAULT_GROW_DATA })
  // inline migration: 'recent' → 'finished'
  if (data.items && data.items.some(i => i.status === 'recent')) {
    data.items = data.items.map(i => i.status === 'recent' ? { ...i, status: 'finished' } : i)
    writeJSON('vera_grow', data)
  }
  return data
}

export function saveGrowData(data) {
  writeJSON('vera_grow', data)
}

export function getGrowItems() {
  return getGrowData().items || []
}

export function addToList(item) {
  try {
    const data = getGrowData()
    data.items.unshift(item)
    data.addCounter = (data.addCounter || 0) + 1
    if (data.addCounter >= (data.nextNoticeAt || 2)) {
      data.addCounter = 0
      data.nextNoticeAt = Math.random() > 0.5 ? 2 : 3
      data.pendingNoticeGeneration = true
    }
    saveGrowData(data)
  } catch(e) {
    console.warn('addToList failed:', e)
  }
}

export function getGrowSuggestion() {
  return getGrowData().suggestion
}

export function saveGrowSuggestion(suggestion) {
  try {
    const data = getGrowData()
    data.suggestion = suggestion
    saveGrowData(data)
  } catch(e) {
    console.warn('saveGrowSuggestion failed:', e)
  }
}

export function getGrowNotice() {
  try {
    const data = getGrowData()
    if (!data.notice) return null
    const age = (Date.now() - new Date(data.notice.generatedAt).getTime()) / 86400000
    if (age > 7) {
      data.notice = null
      saveGrowData(data)
      return null
    }
    return data.notice
  } catch(e) {
    return null
  }
}

export function saveGrowNotice(text) {
  try {
    const data = getGrowData()
    data.notice = { text, generatedAt: new Date().toISOString() }
    data.pendingNoticeGeneration = false
    saveGrowData(data)
  } catch(e) {
    console.warn('saveGrowNotice failed:', e)
  }
}

export function deleteListItem(itemId) {
  try {
    const data = getGrowData()
    data.items = data.items.filter(i => i.id !== itemId)
    saveGrowData(data)
  } catch (e) { console.warn('deleteListItem failed:', e) }
}

export function clearGrowNotice() {
  try {
    const data = getGrowData()
    data.notice = null
    saveGrowData(data)
  } catch(e) {
    console.warn('clearGrowNotice failed:', e)
  }
}

export function markListItemDone(doneItem) {
  try {
    const data  = getGrowData()
    const { title, type = 'Book', author = null } = doneItem

    const existing = data.items.find(i =>
      i.title.toLowerCase().includes(title.toLowerCase()) ||
      title.toLowerCase().includes(i.title.toLowerCase())
    )

    if (existing) {
      existing.status      = 'finished'
      existing.completedAt = new Date().toISOString()
    } else {
      data.items.unshift({
        id:          generateId(),
        title,
        author,
        type,
        status:      'finished',
        addedAt:     new Date().toISOString(),
        completedAt: new Date().toISOString(),
      })
    }

    saveGrowData(data)
    addPendingFollowUp(title, type)
  } catch(e) {
    console.warn('markListItemDone failed:', e)
  }
}

export function removeFromList(titleFragment) {
  try {
    const data = getGrowData()
    data.items = data.items.filter(i =>
      !i.title.toLowerCase().includes(titleFragment.toLowerCase())
    )
    saveGrowData(data)
  } catch(e) {
    console.warn('removeFromList failed:', e)
  }
}

export function addPendingFollowUp(title, type) {
  try {
    const data = getGrowData()
    if (!data.pendingFollowUps) data.pendingFollowUps = []
    if (!data.pendingFollowUps.some(f => f.title === title)) {
      data.pendingFollowUps.push({ title, type, addedAt: new Date().toISOString() })
    }
    saveGrowData(data)
  } catch(e) {}
}

export function popPendingFollowUp() {
  try {
    const data = getGrowData()
    if (!data.pendingFollowUps?.length) return null
    const next = data.pendingFollowUps.shift()
    saveGrowData(data)
    return next
  } catch(e) { return null }
}

// ─── Living summary ───────────────────────────────────────────────────────────

export function getLivingSummary() {
  return readJSON('vera_living_summary', null)
}

export function saveLivingSummary(summaryText) {
  try {
    const existing = getLivingSummary()
    writeJSON('vera_living_summary', {
      summary: summaryText,
      generatedAt: new Date().toISOString(),
      entryCountAtGeneration: getTotalEntryCount(),
      version: existing ? (existing.version || 0) + 1 : 1
    })
  } catch(e) {
    console.error('Vera: saveLivingSummary failed:', e)
  }
}

export function shouldRegenerateSummary() {
  try {
    const summary = getLivingSummary()
    if (!summary) return true
    return getTotalEntryCount() >= (summary.entryCountAtGeneration || 0) + 5
  } catch(e) {
    return false
  }
}

// ─── Entries by week ─────────────────────────────────────────────────────────

export function getEntriesForWeek(weekKey) {
  try {
    const [yearStr, weekStr] = weekKey.split('-')
    const year = parseInt(yearStr, 10)
    const week = parseInt(weekStr, 10)

    const jan4 = new Date(Date.UTC(year, 0, 4))
    const startOfWeek1 = new Date(jan4)
    startOfWeek1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1))

    const weekMonday = new Date(startOfWeek1)
    weekMonday.setUTCDate(startOfWeek1.getUTCDate() + (week - 1) * 7)

    const results = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekMonday)
      d.setUTCDate(weekMonday.getUTCDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      const dayEntries = getEntriesForDate(dateStr)
      results.push(...dayEntries)
    }
    return results
  } catch (e) {
    console.error('Vera: getEntriesForWeek failed:', e)
    return []
  }
}

// ─── Nudge state ──────────────────────────────────────────────────────────────

export function getNudgeState() {
  try {
    const raw = localStorage.getItem('vera_nudge_state')
    return raw ? JSON.parse(raw) : {
      askedReview: [], askedIntention: [],
      askedMonthlyReview: [], askedMonthlyIntention: []
    }
  } catch(e) {
    return { askedReview: [], askedIntention: [], askedMonthlyReview: [], askedMonthlyIntention: [] }
  }
}

export function saveNudgeState(state) {
  try { localStorage.setItem('vera_nudge_state', JSON.stringify(state)) }
  catch(e) { console.warn('saveNudgeState failed:', e) }
}

export function markNudgeAsked(type, key) {
  const state = getNudgeState()
  if (!state[type]) state[type] = []
  if (!state[type].includes(key)) state[type].push(key)
  saveNudgeState(state)
}

// ─── Nudge retry tracking ─────────────────────────────────────────────────────

export function getNudgeAttempts() {
  try { return JSON.parse(localStorage.getItem('vera_nudge_attempts') || '{}') }
  catch(e) { return {} }
}

export function recordNudgeAttempt(key) {
  try {
    const attempts = getNudgeAttempts()
    if (!attempts[key]) attempts[key] = []
    const today = getTodayString()
    if (!attempts[key].includes(today)) attempts[key].push(today)
    localStorage.setItem('vera_nudge_attempts', JSON.stringify(attempts))
  } catch(e) { console.warn('recordNudgeAttempt failed:', e) }
}

export function getNudgeAttemptsCount(key) {
  return (getNudgeAttempts()[key] || []).length
}

export function markNudgeDeclined(key) {
  try {
    const raw = localStorage.getItem('vera_nudge_declined') || '[]'
    const declined = JSON.parse(raw)
    if (!declined.includes(key)) declined.push(key)
    localStorage.setItem('vera_nudge_declined', JSON.stringify(declined))
  } catch(e) { console.warn('markNudgeDeclined failed:', e) }
}

export function isNudgeDeclined(key) {
  try {
    const raw = localStorage.getItem('vera_nudge_declined') || '[]'
    return JSON.parse(raw).includes(key)
  } catch(e) { return false }
}

export function shouldRetryNudge(key) {
  const count = getNudgeAttemptsCount(key)
  const isReview = key.includes('review')
  // Reviews: up to 3 attempts; intentions: up to 2 attempts
  const maxAttempts = isReview ? 3 : 2
  return count < maxAttempts && !isNudgeDeclined(key)
}

// ─── Entries by month ──────────────────────────────────────────────────────────

export function getEntriesForMonth(monthKey) {
  try {
    const [year, month] = monthKey.split('-').map(Number)
    const daysInMonth = new Date(year, month, 0).getDate()
    const entries = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      entries.push(...(getEntriesForDate(dateStr) || []))
    }
    return entries
  } catch(e) {
    console.error('Vera: getEntriesForMonth failed:', e)
    return []
  }
}

// ─── Export scanner for convenience ──────────────────────────────────────────

export { scanForSymptoms }
