import type { FilterPreset, PresetScope } from '@/types/ticket'

const DB_NAME = 'customer-care-presets'
const DB_VERSION = 1
const GLOBAL_STORE = 'ticket_presets_global'
const LOCAL_STORE = 'ticket_presets_local'

const GLOBAL_MIN_ID = 0
const GLOBAL_MAX_ID = 999
const LOCAL_MIN_ID = 1000
const LOCAL_MAX_ID = 99999

const TYPE_GLOBAL = 1
const TYPE_COMPANY = 2
const TYPE_USER = 3

interface IndexedPresetRow {
  id: number
  description?: string
  style: 'card' | 'table' | 'progress'
  is_default: boolean
  filters_json: FilterPreset['filters']
  table_config_json?: FilterPreset['tableConfig']
  card_config_json?: FilterPreset['cardConfig']
  progress_config_json?: FilterPreset['progressConfig']
  created_by?: string
  updated_by?: string
  created_at: string
  updated_at: string
  deleted_at?: string | null
  Inactive: boolean
  Type: 1 | 2 | 3
  account_id?: string
  owner_user_name?: string
  name: string
}

interface RuntimePresetContext {
  accountId?: string
  ownerUserName?: string
  userName?: string
}

interface OpenOptions {
  createIfMissing?: boolean
}

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(options: OpenOptions = {}): Promise<IDBDatabase | null> {
  if (!hasIndexedDb()) return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      if (!options.createIfMissing) return
      const db = request.result
      ensureStores(db)
    }
  })
}

function ensureStores(db: IDBDatabase): void {
  const globalStore = db.objectStoreNames.contains(GLOBAL_STORE)
    ? null
    : db.createObjectStore(GLOBAL_STORE, { keyPath: 'id' })
  const localStore = db.objectStoreNames.contains(LOCAL_STORE)
    ? null
    : db.createObjectStore(LOCAL_STORE, { keyPath: 'id' })

  const ensureIndexes = (store: IDBObjectStore, isLocal: boolean) => {
    if (!store.indexNames.contains('byInactive')) store.createIndex('byInactive', 'Inactive')
    if (!store.indexNames.contains('byIsDefault')) store.createIndex('byIsDefault', 'is_default')
    if (!store.indexNames.contains('byUpdatedAt')) store.createIndex('byUpdatedAt', 'updated_at')
    if (!store.indexNames.contains('byType')) store.createIndex('byType', 'Type')
    if (isLocal) {
      if (!store.indexNames.contains('byAccount')) store.createIndex('byAccount', 'account_id')
      if (!store.indexNames.contains('byOwner')) store.createIndex('byOwner', 'owner_user_name')
      if (!store.indexNames.contains('byAccountAndInactive')) {
        store.createIndex('byAccountAndInactive', ['account_id', 'Inactive'])
      }
      if (!store.indexNames.contains('byOwnerAndInactive')) {
        store.createIndex('byOwnerAndInactive', ['owner_user_name', 'Inactive'])
      }
    }
  }

  if (globalStore) ensureIndexes(globalStore, false)
  if (localStore) ensureIndexes(localStore, true)
}

function withTransaction<T>(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  runner: (store: IDBObjectStore) => Promise<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    runner(store)
      .then((result) => {
        tx.oncomplete = () => resolve(result)
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
      .catch(reject)
  })
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function normalizeScope(scope?: PresetScope): PresetScope {
  if (scope === 'system' || scope === 'company' || scope === 'user') return scope
  return 'user'
}

function resolveType(scope?: PresetScope): 1 | 2 | 3 {
  const normalized = normalizeScope(scope)
  if (normalized === 'system') return TYPE_GLOBAL
  if (normalized === 'company') return TYPE_COMPANY
  return TYPE_USER
}

function resolveScope(type: number): PresetScope {
  if (type === TYPE_GLOBAL) return 'system'
  if (type === TYPE_COMPANY) return 'company'
  return 'user'
}

function toRow(
  preset: FilterPreset,
  id: number,
  context: RuntimePresetContext,
  nowIso: string,
  createdAtIso?: string
): IndexedPresetRow {
  const scope = normalizeScope(preset.scope)
  const type = resolveType(scope)
  return {
    id,
    name: preset.name,
    description: undefined,
    style: (preset.style ?? 'card') as IndexedPresetRow['style'],
    is_default: !!preset.isDefault,
    filters_json: preset.filters,
    table_config_json: preset.tableConfig,
    card_config_json: preset.cardConfig,
    progress_config_json: preset.progressConfig,
    created_by: context.userName,
    updated_by: context.userName,
    created_at: createdAtIso ?? nowIso,
    updated_at: nowIso,
    deleted_at: null,
    Inactive: false,
    Type: type,
    account_id:
      scope === 'company'
        ? (preset.customerId?.trim() || context.accountId || '')
        : (context.accountId || ''),
    owner_user_name:
      scope === 'user'
        ? (preset.ownerUserName?.trim() || context.ownerUserName || '')
        : '',
  }
}

function rowToPreset(row: IndexedPresetRow): FilterPreset {
  const scope = resolveScope(row.Type)
  return {
    id: row.id,
    name: row.name,
    filters: row.filters_json,
    style: row.style,
    isDefault: row.is_default,
    scope,
    isSystemPreset: false,
    customerId: scope === 'company' ? row.account_id || undefined : undefined,
    ownerUserName: scope === 'user' ? row.owner_user_name || undefined : undefined,
    tableConfig: row.table_config_json,
    cardConfig: row.card_config_json,
    progressConfig: row.progress_config_json,
  }
}

async function getAllRows(store: IDBObjectStore): Promise<IndexedPresetRow[]> {
  return requestToPromise(store.getAll() as IDBRequest<IndexedPresetRow[]>)
}

async function getNextAvailableId(
  store: IDBObjectStore,
  minId: number,
  maxId: number
): Promise<number> {
  const rows = await getAllRows(store)
  const used = new Set(rows.map((row) => row.id))
  for (let id = minId; id <= maxId; id += 1) {
    if (!used.has(id)) return id
  }
  throw new Error(`No available preset IDs in range ${minId}-${maxId}`)
}

function pickStoreByScope(scope?: PresetScope): typeof GLOBAL_STORE | typeof LOCAL_STORE {
  const normalized = normalizeScope(scope)
  return normalized === 'system' ? GLOBAL_STORE : LOCAL_STORE
}

export async function listIndexedDbPresets(context: RuntimePresetContext): Promise<FilterPreset[]> {
  const db = await openDb({ createIfMissing: true })
  if (!db) return []
  try {
    const globalRows = await withTransaction(db, GLOBAL_STORE, 'readonly', async (store) => {
      const rows = await getAllRows(store)
      return rows.filter((row) => !row.Inactive)
    })
    const localRows = await withTransaction(db, LOCAL_STORE, 'readonly', async (store) => {
      const rows = await getAllRows(store)
      return rows.filter((row) => {
        if (row.Inactive) return false
        if (row.Type === TYPE_COMPANY) {
          return !!context.accountId && row.account_id === context.accountId
        }
        if (row.Type === TYPE_USER) {
          const owner = (context.ownerUserName || '').toUpperCase()
          return !!owner && (row.owner_user_name || '').toUpperCase() === owner
        }
        return true
      })
    })
    return [...globalRows, ...localRows]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(rowToPreset)
  } finally {
    db.close()
  }
}

export async function saveIndexedDbPreset(
  preset: FilterPreset,
  context: RuntimePresetContext
): Promise<FilterPreset> {
  const db = await openDb({ createIfMissing: true })
  if (!db) return preset
  try {
    const storeName = pickStoreByScope(preset.scope)
    const minId = storeName === GLOBAL_STORE ? GLOBAL_MIN_ID : LOCAL_MIN_ID
    const maxId = storeName === GLOBAL_STORE ? GLOBAL_MAX_ID : LOCAL_MAX_ID
    const nowIso = new Date().toISOString()

    return withTransaction(db, storeName, 'readwrite', async (store) => {
      let idNum: number | null = null
      if (typeof preset.id === 'number' && Number.isInteger(preset.id)) {
        idNum = preset.id
      } else if (typeof preset.id === 'string') {
        const n = Number.parseInt(preset.id, 10)
        if (Number.isInteger(n)) idNum = n
      }
      if (idNum == null || idNum < minId || idNum > maxId) {
        idNum = await getNextAvailableId(store, minId, maxId)
      }

      const existing = (await requestToPromise(store.get(idNum) as IDBRequest<IndexedPresetRow | undefined>)) || undefined
      const row = toRow(preset, idNum, context, nowIso, existing?.created_at)
      if (existing?.Inactive) row.Inactive = false
      await requestToPromise(store.put(row))
      return rowToPreset(row)
    })
  } finally {
    db.close()
  }
}

export async function markIndexedDbPresetInactive(
  presetId: string | number,
  scope?: PresetScope,
  context?: RuntimePresetContext
): Promise<boolean> {
  const db = await openDb({ createIfMissing: true })
  if (!db) return false
  try {
    const tryStores: Array<typeof GLOBAL_STORE | typeof LOCAL_STORE> =
      scope != null ? [pickStoreByScope(scope)] : [GLOBAL_STORE, LOCAL_STORE]
    const idNum = typeof presetId === 'number' ? presetId : Number.parseInt(String(presetId), 10)
    if (!Number.isInteger(idNum)) return false

    for (const storeName of tryStores) {
      // eslint-disable-next-line no-await-in-loop
      const changed = await withTransaction(db, storeName, 'readwrite', async (store) => {
        const existing = (await requestToPromise(
          store.get(idNum) as IDBRequest<IndexedPresetRow | undefined>
        )) || undefined
        if (!existing) return false
        existing.Inactive = true
        existing.deleted_at = new Date().toISOString()
        existing.updated_at = existing.deleted_at
        existing.updated_by = context?.userName || existing.updated_by
        await requestToPromise(store.put(existing))
        return true
      })
      if (changed) return true
    }
    return false
  } finally {
    db.close()
  }
}

export async function setIndexedDbDefaultPreset(
  presetId: string | number,
  scope?: PresetScope,
  context?: RuntimePresetContext
): Promise<void> {
  const db = await openDb({ createIfMissing: true })
  if (!db) return
  try {
    const tryStores: Array<typeof GLOBAL_STORE | typeof LOCAL_STORE> =
      scope != null ? [pickStoreByScope(scope)] : [GLOBAL_STORE, LOCAL_STORE]
    const idNum = typeof presetId === 'number' ? presetId : Number.parseInt(String(presetId), 10)
    if (!Number.isInteger(idNum)) return
    const nowIso = new Date().toISOString()

    for (const storeName of tryStores) {
      // eslint-disable-next-line no-await-in-loop
      const updated = await withTransaction(db, storeName, 'readwrite', async (store) => {
        const rows = await getAllRows(store)
        const target = rows.find((row) => row.id === idNum && !row.Inactive)
        if (!target) return false
        const targetType = target.Type
        const targetAccount = target.account_id || ''
        const targetOwner = (target.owner_user_name || '').toUpperCase()
        const nextRows = rows.map((row) => {
          if (row.Inactive) return row
          let sameBucket = false
          if (row.Type !== targetType) {
            sameBucket = false
          } else if (row.Type === TYPE_COMPANY) {
            sameBucket = (row.account_id || '') === targetAccount
          } else if (row.Type === TYPE_USER) {
            sameBucket = (row.owner_user_name || '').toUpperCase() === targetOwner
          } else {
            sameBucket = true
          }
          if (!sameBucket) return row
          return {
            ...row,
            is_default: row.id === idNum,
            updated_at: nowIso,
            updated_by: context?.userName || row.updated_by,
          }
        })
        await Promise.all(nextRows.map((row) => requestToPromise(store.put(row))))
        return true
      })
      if (updated) return
    }
  } finally {
    db.close()
  }
}

export async function bootstrapIndexedDbPresets(
  presets: FilterPreset[],
  context: RuntimePresetContext
): Promise<void> {
  if (!presets.length) return
  const db = await openDb({ createIfMissing: true })
  if (!db) return
  try {
    const existing = await listIndexedDbPresets(context)
    if (existing.length > 0) return
    for (const preset of presets) {
      // Only persist mutable/non-system preset rows.
      if (preset.isSystemPreset) continue
      // eslint-disable-next-line no-await-in-loop
      await saveIndexedDbPreset(preset, context)
    }
  } finally {
    db.close()
  }
}

export function getPresetIdRanges() {
  return {
    global: { min: GLOBAL_MIN_ID, max: GLOBAL_MAX_ID },
    local: { min: LOCAL_MIN_ID, max: LOCAL_MAX_ID },
  }
}

export const __ticketPresetIndexedDbTestUtils = {
  normalizeScope,
  resolveType,
  resolveScope,
  pickStoreByScope,
}

