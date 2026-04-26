export const CURRENT_SCHEMA_VERSION = 1

const VERSION_KEY = 'vera_schema_version'

// migrations[N] transforms data from version N-1 to version N
// Each function must be safe to run on partial or missing data
const migrations = {}

// Example of how future migrations will look:
// migrations[2] = function() {
//   try {
//     const log = JSON.parse(localStorage.getItem('vera_learning_log') || '{"items":[]}')
//     log.items = log.items.map(item => ({
//       ...item,
//       source: item.source || 'user'
//     }))
//     localStorage.setItem('vera_learning_log', JSON.stringify(log))
//   } catch(e) {
//     console.warn('Migration 2 failed:', e)
//   }
// }

export function runMigrations() {
  let storedVersion = 0
  try {
    const stored = localStorage.getItem(VERSION_KEY)
    storedVersion = stored ? parseInt(stored, 10) : 0
  } catch(e) {
    storedVersion = 0
  }

  if (storedVersion === CURRENT_SCHEMA_VERSION) return

  if (storedVersion > CURRENT_SCHEMA_VERSION) {
    console.warn(`Vera: stored schema version (${storedVersion}) is newer than app version (${CURRENT_SCHEMA_VERSION}). Skipping migrations.`)
    return
  }

  for (let v = storedVersion + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
    if (migrations[v]) {
      try {
        migrations[v]()
        if (window.VERA_DEBUG) console.log(`Vera: ran migration to schema version ${v}`)
      } catch(e) {
        console.error(`Vera: migration to version ${v} failed:`, e)
      }
    }
  }

  try {
    localStorage.setItem(VERSION_KEY, CURRENT_SCHEMA_VERSION.toString())
  } catch(e) {
    console.error('Vera: failed to save schema version:', e)
  }
}

export function getStoredSchemaVersion() {
  try {
    const v = localStorage.getItem(VERSION_KEY)
    return v ? parseInt(v, 10) : 0
  } catch(e) {
    return 0
  }
}
