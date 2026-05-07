import htm from 'https://unpkg.com/htm?module'
import {
  getGrowData,
  saveGrowData,
  getGrowItems,
  getGrowSuggestion,
  saveGrowSuggestion,
  getGrowNotice,
  saveGrowNotice,
  addToList,
  generateId,
  getRecentEntries,
} from '../lib/storage.js'
import { generateGrowSuggestion, generateGrowNotice } from '../lib/api.js'
import GrowSuggestCard from '../components/GrowSuggestCard.js'
import GrowNoticesCard from '../components/GrowNoticesCard.js'
import GrowList from '../components/GrowList.js'

const html = htm.bind(React.createElement)

const SEVEN_DAYS_MS = 7 * 86400000

export default function GrowTab({ listVersion }) {
  const [suggestion,       setSuggestion]       = React.useState(() => getGrowSuggestion())
  const [notice,           setNotice]           = React.useState(() => getGrowNotice())
  const [items,            setItems]            = React.useState(() => getGrowItems())
  const [showAddForm,      setShowAddForm]      = React.useState(false)
  const [loadingSuggestion, setLoadingSuggestion] = React.useState(false)

  // On mount — generate suggestion if stale, check pending notice
  React.useEffect(() => {
    const s = getGrowSuggestion()
    const isStale = !s || (Date.now() - new Date(s.generatedAt).getTime()) > SEVEN_DAYS_MS
    if (isStale) handleRefreshSuggestion()

    const data = getGrowData()
    if (data.pendingNoticeGeneration) handleGenerateNotice()
  }, [])

  // Refresh items when Share tab adds something via conversation
  React.useEffect(() => {
    setItems(getGrowItems())
  }, [listVersion])

  async function handleRefreshSuggestion() {
    setLoadingSuggestion(true)
    const recentEntries = getRecentEntries(5)
    const currentItems  = getGrowItems()
    const result = await generateGrowSuggestion(currentItems, recentEntries)
    if (result) {
      saveGrowSuggestion(result)
      setSuggestion(result)
    }
    setLoadingSuggestion(false)
  }

  async function handleGenerateNotice() {
    const recentEntries = getRecentEntries(8)
    const currentItems  = getGrowItems()
    const text = await generateGrowNotice(currentItems, recentEntries)
    if (text) {
      saveGrowNotice(text)
      setNotice(getGrowNotice())
    }
  }

  function handleAddToList(itemData) {
    const isFinished = itemData.status === 'finished'
    addToList({
      id: generateId(),
      title: itemData.title,
      author: itemData.author || null,
      type: itemData.type,
      status: isFinished ? 'finished' : 'ahead',
      addedAt: new Date().toISOString(),
      completedAt: isFinished ? new Date().toISOString() : null,
    })
    const updated = getGrowItems()
    setItems(updated)
    setShowAddForm(false)

    const data = getGrowData()
    if (data.pendingNoticeGeneration) handleGenerateNotice()
  }

  function handleAddFromSuggestion() {
    if (!suggestion) return
    addToList({
      id: generateId(),
      title: suggestion.title,
      author: suggestion.author || null,
      type: suggestion.type,
      status: 'ahead',
      addedAt: new Date().toISOString(),
      completedAt: null,
    })
    setItems(getGrowItems())

    const data = getGrowData()
    if (data.pendingNoticeGeneration) handleGenerateNotice()
  }

  function handleMarkDone(itemId) {
    const data = getGrowData()
    const item = data.items.find(i => i.id === itemId)
    if (!item) return
    item.status = 'finished'
    item.completedAt = new Date().toISOString()
    saveGrowData(data)
    setItems(getGrowItems())
  }

  const aheadItems    = items.filter(i => i.status === 'ahead')
  const finishedItems = items.filter(i => i.status === 'finished')

  return html`
    <div style=${{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div class="atmos grow-atmos"></div>

      <div class="grow-scroll">

        <div class="mv-divider" style=${{ marginTop: 0 }}>
          <div class="mv-div-line"></div>
          <div class="mv-div-diamond"></div>
          <div class="mv-div-label">Vera suggests</div>
          <div class="mv-div-diamond"></div>
          <div class="mv-div-line"></div>
        </div>

        <${GrowSuggestCard}
          suggestion=${suggestion}
          loading=${loadingSuggestion}
          onAnother=${handleRefreshSuggestion}
          onAddToList=${handleAddFromSuggestion}
        />

        ${notice && html`
          <div class="mv-divider">
            <div class="mv-div-line"></div>
            <div class="mv-div-diamond"></div>
            <div class="mv-div-label">Vera notices</div>
            <div class="mv-div-diamond"></div>
            <div class="mv-div-line"></div>
          </div>
          <${GrowNoticesCard} notice=${notice} />
        `}

        <div class="mv-divider">
          <div class="mv-div-line"></div>
          <div class="mv-div-diamond"></div>
          <div class="mv-div-label">Your list</div>
          <div class="mv-div-diamond"></div>
          <div class="mv-div-line"></div>
        </div>

        <${GrowList}
          aheadItems=${aheadItems}
          finishedItems=${finishedItems}
          showAddForm=${showAddForm}
          onShowAddForm=${() => setShowAddForm(true)}
          onHideAddForm=${() => setShowAddForm(false)}
          onAdd=${handleAddToList}
          onMarkDone=${handleMarkDone}
        />

      </div>
    </div>
  `
}
