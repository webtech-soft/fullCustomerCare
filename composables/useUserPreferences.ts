import { ref, computed, watch, onMounted } from 'vue'
import type { 
  UserTicketPreferences, 
  FilterPreset, 
  TicketFilters,
  StylePreferences,
  TicketStyle,
  CardStyleConfig,
  TableStyleConfig,
  BoardStyleConfig,
  ProgressStyleConfig,
  TabulationDimension,
  PresetScope
} from '@/types/ticket'
import {
  DEFAULT_STYLE_PREFERENCES,
  DEFAULT_FILTERS,
  DEFAULT_TICKET_ACTION_VISIBILITY,
} from '@/types/ticket'
import type { TicketActionVisibility } from '@/types/ticket'
import {
  fetchUserPreferences,
  saveUserPreferences,
  createFilterPreset,
  updateFilterPreset,
  deleteFilterPreset,
  getDefaultUserPreferences,
  savePreferencesToLocalStorage,
} from '@/api/userPreferences'
import {
  bootstrapIndexedDbPresets,
  listIndexedDbPresets,
  markIndexedDbPresetInactive,
  saveIndexedDbPreset,
  setIndexedDbDefaultPreset,
} from '@/lib/ticketPresetIndexedDb'
import {
  ALL_TICKETS_SYSTEM_PRESET_ID,
  SYSTEM_TICKET_PRESETS,
} from '@/constants/systemTicketPresets'
import { getDevUserContext, loadDevUserContext } from '@/composables/useDevUserContext'

// Singleton state to share across components
const preferences = ref<UserTicketPreferences | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const isInitialized = ref(false)

// Debounce timer for auto-save
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null
const SAVE_DEBOUNCE_MS = 1000

interface RuntimeUserContext {
  userName: string
  roleId: number
  customerId: string
  isAatech: boolean
}

function toIndexedPresetContext(ctx: RuntimeUserContext) {
  return {
    accountId: ctx.customerId,
    ownerUserName: ctx.userName,
    userName: ctx.userName,
  }
}

function readRuntimeUserContext(): RuntimeUserContext {
  if (typeof window === 'undefined') {
    return { userName: '', roleId: 0, customerId: '', isAatech: false }
  }
  const devCtx = import.meta.env.DEV ? getDevUserContext() : { user_name: '', role_ID: 0, customer_ID: '' }
  const rawName =
    devCtx.user_name ||
    localStorage.getItem('current_user') ||
    localStorage.getItem('user_name') ||
    ''
  const userName = rawName.trim()
  const roleIdRaw = devCtx.role_ID ? String(devCtx.role_ID) : localStorage.getItem('role_ID') || '0'
  const roleId = Number.parseInt(roleIdRaw, 10)
  const customerId = (devCtx.customer_ID || localStorage.getItem('customer_ID') || '').trim()
  const isAatech = userName.toUpperCase() === 'AATECH'
  return {
    userName,
    roleId: Number.isNaN(roleId) ? 0 : roleId,
    customerId,
    isAatech,
  }
}

function inferPresetScope(preset: FilterPreset): PresetScope {
  if (preset.scope) return preset.scope
  if (preset.isSystemPreset) return 'system'
  return 'user'
}

function idEquals(a: string | number, b: string | number): boolean {
  if (typeof a === 'number' && typeof b === 'number') return a === b
  if (String(a) === String(b)) return true
  const aNum = Number.parseInt(String(a), 10)
  const bNum = Number.parseInt(String(b), 10)
  return Number.isInteger(aNum) && Number.isInteger(bNum) && aNum === bNum
}

function normalizePresetForScope(preset: FilterPreset, ctx: RuntimeUserContext): FilterPreset {
  const scope = inferPresetScope(preset)
  const normalized: FilterPreset = { ...preset, scope, isSystemPreset: scope === 'system' }
  if (scope === 'company') {
    normalized.customerId = normalized.customerId?.trim() || ctx.customerId
    delete normalized.ownerUserName
  } else if (scope === 'user') {
    normalized.ownerUserName = normalized.ownerUserName?.trim() || ctx.userName
    delete normalized.customerId
  } else {
    delete normalized.customerId
    delete normalized.ownerUserName
  }
  return normalized
}

function canReadPreset(preset: FilterPreset, ctx: RuntimeUserContext): boolean {
  if (ctx.isAatech) return true
  const scope = inferPresetScope(preset)
  if (scope === 'system') return true
  if (scope === 'company') return !!ctx.customerId && preset.customerId === ctx.customerId
  if (!ctx.userName) {
    // During local-only/dev sessions, username may be unset.
    // Keep user-scoped presets with empty owner visible in the same browser context.
    return !(preset.ownerUserName ?? '').trim()
  }
  return preset.ownerUserName?.toUpperCase() === ctx.userName.toUpperCase()
}

function normalizeScopedPresets(prefs: UserTicketPreferences): boolean {
  const ctx = readRuntimeUserContext()
  let changed = false
  const normalized = prefs.filterPresets.map((preset) => {
    const next = normalizePresetForScope(preset, ctx)
    if (JSON.stringify(next) !== JSON.stringify(preset)) changed = true
    return next
  })
  prefs.filterPresets = normalized
  return changed
}

function lastUsedFiltersMatchAllTicketsBaseline(f: TicketFilters): boolean {
  const d = DEFAULT_FILTERS
  return (
    f.dateRange === d.dateRange &&
    f.workorder === d.workorder &&
    f.invoice === d.invoice &&
    f.batch === d.batch &&
    f.quote === d.quote &&
    f.tabulateBy === undefined &&
    !f.salesrep?.trim() &&
    !f.technician?.trim() &&
    !f.onlyOverdue
  )
}

function systemPresetSnapshotMatches(a: FilterPreset, b: FilterPreset): boolean {
  return (
    a.name === b.name &&
    a.style === b.style &&
    JSON.stringify(a.filters) === JSON.stringify(b.filters) &&
    JSON.stringify(a.tableConfig) === JSON.stringify(b.tableConfig) &&
    JSON.stringify(a.cardConfig) === JSON.stringify(b.cardConfig) &&
    JSON.stringify(a.progressConfig) === JSON.stringify(b.progressConfig)
  )
}

function mergeSystemTicketPresets(
  prefs: UserTicketPreferences,
  persist: () => void
): void {
  let changed = false
  for (const def of SYSTEM_TICKET_PRESETS) {
    const idx = prefs.filterPresets.findIndex((p) => p.id === def.id)
    if (idx === -1) {
      prefs.filterPresets.push({ ...def, isDefault: false, scope: 'system', isSystemPreset: true })
      changed = true
    } else {
      const cur = prefs.filterPresets[idx]
      if (cur.isSystemPreset) {
        const next: FilterPreset = { ...def, isDefault: cur.isDefault, scope: 'system', isSystemPreset: true }
        if (!systemPresetSnapshotMatches(cur, next)) {
          prefs.filterPresets[idx] = next
          changed = true
        }
      }
    }
  }
  const hadFavorite = prefs.filterPresets.some((p) => p.isDefault)
  if (!hadFavorite && lastUsedFiltersMatchAllTicketsBaseline(prefs.lastUsedFilters)) {
    for (const p of prefs.filterPresets) {
      const next = p.id === ALL_TICKETS_SYSTEM_PRESET_ID
      if (p.isDefault !== next) changed = true
      p.isDefault = next
    }
  }
  if (changed) persist()
}

/**
 * Composable for managing user ticket preferences
 * Provides reactive state and methods for CRUD operations on preferences
 */
export function useUserPreferences() {
  // Computed getters for easy access
  const stylePreferences = computed(() => 
    preferences.value?.stylePreferences ?? DEFAULT_STYLE_PREFERENCES
  )
  
  const filterPresets = computed(() => {
    const all = preferences.value?.filterPresets ?? []
    const ctx = readRuntimeUserContext()
    return all.filter((preset) => canReadPreset(preset, ctx))
  })
  
  const lastUsedFilters = computed(() => 
    preferences.value?.lastUsedFilters ?? DEFAULT_FILTERS
  )
  
  const currentStyle = computed(() => 
    stylePreferences.value.defaultStyle
  )
  
  const cardConfig = computed(() => 
    stylePreferences.value.card
  )
  
  const tableConfig = computed(() => 
    stylePreferences.value.table
  )
  
  const boardConfig = computed(() => 
    stylePreferences.value.board
  )
  
  const progressConfig = computed(() => 
    stylePreferences.value.progress
  )

  const ticketActionVisibility = computed<TicketActionVisibility>(() => ({
    ...DEFAULT_TICKET_ACTION_VISIBILITY,
    ...(stylePreferences.value.ticketActionVisibility ?? {}),
  }))

  /** Merge defaults for action visibility and strip legacy `nextStep` from field/column lists. */
  function mergeTicketActionVisibilityAndMigrateNextStep(): void {
    if (!preferences.value?.stylePreferences) return
    const sp = preferences.value.stylePreferences
    const prevVis = sp.ticketActionVisibility
    sp.ticketActionVisibility = {
      ...DEFAULT_TICKET_ACTION_VISIBILITY,
      ...(prevVis ?? {}),
    }

    const strip = (keys: string[]) => keys.filter((k) => k !== 'nextStep')
    let changed = false
    if (!prevVis) changed = true

    const card = sp.card
    const table = sp.table
    const board = sp.board
    const progress = sp.progress

    if (card?.visibleFields?.includes('nextStep') || card?.fieldOrder?.includes('nextStep')) {
      preferences.value.stylePreferences.card = {
        ...card,
        visibleFields: strip(card.visibleFields ?? []),
        fieldOrder: strip(card.fieldOrder ?? []),
      }
      changed = true
    }
    if (table?.visibleColumns?.includes('nextStep') || table?.columnOrder?.includes('nextStep')) {
      preferences.value.stylePreferences.table = {
        ...table,
        visibleColumns: strip(table.visibleColumns ?? []),
        columnOrder: strip(table.columnOrder ?? []),
      }
      changed = true
    }
    if (board?.visibleFields?.includes('nextStep')) {
      preferences.value.stylePreferences.board = {
        ...board,
        visibleFields: strip(board.visibleFields ?? []),
      }
      changed = true
    }
    if (progress?.visibleFields?.includes('nextStep')) {
      preferences.value.stylePreferences.progress = {
        ...progress,
        visibleFields: strip(progress.visibleFields ?? []),
      }
      changed = true
    }

    const nextPresets = preferences.value.filterPresets.map((preset) => {
      let next: FilterPreset = { ...preset }
      let pChanged = false
      if (next.tableConfig?.visibleColumns?.includes('nextStep') || next.tableConfig?.columnOrder?.includes('nextStep')) {
        next = {
          ...next,
          tableConfig: {
            ...next.tableConfig!,
            visibleColumns: strip(next.tableConfig!.visibleColumns ?? []),
            columnOrder: strip(next.tableConfig!.columnOrder ?? []),
          },
        }
        pChanged = true
      }
      if (next.cardConfig?.visibleFields?.includes('nextStep') || next.cardConfig?.fieldOrder?.includes('nextStep')) {
        next = {
          ...next,
          cardConfig: {
            ...next.cardConfig!,
            visibleFields: strip(next.cardConfig!.visibleFields ?? []),
            fieldOrder: strip(next.cardConfig!.fieldOrder ?? []),
          },
        }
        pChanged = true
      }
      if (next.progressConfig?.visibleFields?.includes('nextStep')) {
        next = {
          ...next,
          progressConfig: {
            ...next.progressConfig!,
            visibleFields: strip(next.progressConfig!.visibleFields ?? []),
          },
        }
        pChanged = true
      }
      if (pChanged) changed = true
      return next
    })
    preferences.value.filterPresets = nextPresets
    if (changed) savePreferencesDebounced()
  }

  /** Pin `actions` last among visible keys; strip when not visible. */
  function pinActionsInMutableOrder(visible: string[], columnOrder: string[]): string[] {
    const visibleSet = new Set(visible)
    const hasActions = visibleSet.has('actions')
    const withoutActions = columnOrder.filter((k) => k !== 'actions')
    if (!hasActions) return withoutActions
    const visibleNonActions = withoutActions.filter((k) => visibleSet.has(k) && k !== 'actions')
    const hidden = withoutActions.filter((k) => !visibleSet.has(k))
    return [...visibleNonActions, 'actions', ...hidden]
  }

  /** Add synthetic `actions` field when missing so the row-actions column stays visible for existing data. */
  function migrateActionsDisplayField(): void {
    if (!preferences.value?.stylePreferences) return
    let changed = false
    const sp = preferences.value.stylePreferences

    const table = sp.table
    if (!table.visibleColumns.includes('actions')) {
      const vc = [...table.visibleColumns, 'actions']
      const baseOrder = table.columnOrder.length > 0 ? table.columnOrder : table.visibleColumns
      preferences.value.stylePreferences.table = {
        ...table,
        visibleColumns: vc,
        columnOrder: pinActionsInMutableOrder(vc, baseOrder),
      }
      changed = true
    } else {
      const co = pinActionsInMutableOrder(table.visibleColumns, table.columnOrder)
      if (JSON.stringify(co) !== JSON.stringify(table.columnOrder)) {
        preferences.value.stylePreferences.table = { ...table, columnOrder: co }
        changed = true
      }
    }

    const card = preferences.value.stylePreferences.card
    if (!card.visibleFields.includes('actions')) {
      const vf = [...card.visibleFields, 'actions']
      const baseFo = card.fieldOrder.length > 0 ? card.fieldOrder : card.visibleFields
      preferences.value.stylePreferences.card = {
        ...card,
        visibleFields: vf,
        fieldOrder: pinActionsInMutableOrder(vf, baseFo),
      }
      changed = true
    } else {
      const fo = pinActionsInMutableOrder(card.visibleFields, card.fieldOrder)
      if (JSON.stringify(fo) !== JSON.stringify(card.fieldOrder)) {
        preferences.value.stylePreferences.card = { ...card, fieldOrder: fo }
        changed = true
      }
    }

    const nextPresets = preferences.value.filterPresets.map((preset) => {
      let next: FilterPreset = { ...preset }
      let pChanged = false

      if (preset.tableConfig?.visibleColumns && !preset.tableConfig.visibleColumns.includes('actions')) {
        const vc = [...preset.tableConfig.visibleColumns, 'actions']
        const base =
          preset.tableConfig.columnOrder && preset.tableConfig.columnOrder.length > 0
            ? preset.tableConfig.columnOrder
            : preset.tableConfig.visibleColumns
        next.tableConfig = {
          ...preset.tableConfig,
          visibleColumns: vc,
          columnOrder: pinActionsInMutableOrder(vc, base),
        }
        pChanged = true
      }

      if (preset.cardConfig?.visibleFields && !preset.cardConfig.visibleFields.includes('actions')) {
        const vf = [...preset.cardConfig.visibleFields, 'actions']
        const baseFo =
          preset.cardConfig.fieldOrder && preset.cardConfig.fieldOrder.length > 0
            ? preset.cardConfig.fieldOrder
            : preset.cardConfig.visibleFields
        next.cardConfig = {
          ...preset.cardConfig,
          visibleFields: vf,
          fieldOrder: pinActionsInMutableOrder(vf, baseFo),
        }
        pChanged = true
      }

      if (preset.progressConfig?.visibleFields && !preset.progressConfig.visibleFields.includes('actions')) {
        next.progressConfig = {
          ...preset.progressConfig,
          visibleFields: [...preset.progressConfig.visibleFields, 'actions'],
        }
        pChanged = true
      }

      if (pChanged) changed = true
      return next
    })
    preferences.value.filterPresets = nextPresets

    if (changed) savePreferencesDebounced()
  }

  /** Replace one key with another in column/field lists, deduping the new key. */
  function replaceKeyInFieldList(keys: string[], oldKey: string, newKey: string): string[] {
    if (!keys.includes(oldKey)) return keys
    return keys
      .map((k) => (k === oldKey ? newKey : k))
      .filter((k, i, arr) => k !== newKey || arr.indexOf(newKey) === i)
  }

  function migrateIsAgingTicketToReadyForLabel(): void {
    if (!preferences.value?.stylePreferences) return
    const sp = preferences.value.stylePreferences
    const card = sp.card
    const table = sp.table
    const board = sp.board
    const progress = sp.progress
    const cardChanged =
      card?.visibleFields?.includes('isAgingTicket') || card?.fieldOrder?.includes('isAgingTicket')
    const tableChanged =
      table?.visibleColumns?.includes('isAgingTicket') || table?.columnOrder?.includes('isAgingTicket')
    const boardChanged = board?.visibleFields?.includes('isAgingTicket')
    const progressChanged = progress?.visibleFields?.includes('isAgingTicket')
    if (!cardChanged && !tableChanged && !boardChanged && !progressChanged) return

    const replace = (keys: string[]) => replaceKeyInFieldList(keys, 'isAgingTicket', 'readyForLabel')
    preferences.value = {
      ...preferences.value!,
      stylePreferences: {
        ...sp,
        card: card
          ? {
              ...card,
              visibleFields: replace(card.visibleFields ?? []),
              fieldOrder: replace(card.fieldOrder ?? []),
            }
          : sp.card,
        table: table
          ? {
              ...table,
              visibleColumns: replace(table.visibleColumns ?? []),
              columnOrder: replace(table.columnOrder ?? []),
            }
          : sp.table,
        board: board
          ? { ...board, visibleFields: replace(board.visibleFields ?? []) }
          : sp.board,
        progress: progress
          ? { ...progress, visibleFields: replace(progress.visibleFields ?? []) }
          : sp.progress,
      },
    }
    savePreferencesDebounced()
  }

  /** Replace deprecated promiseOverdueByMinutes with overdueTimeLabel in column/field lists. */
  function migratePromiseOverdueToOverdueTime(): void {
    if (!preferences.value?.stylePreferences) return
    const sp = preferences.value.stylePreferences
    const card = sp.card
    const table = sp.table
    const board = sp.board
    const progress = sp.progress
    const hasOld =
      card?.visibleFields?.includes('promiseOverdueByMinutes') ||
      card?.fieldOrder?.includes('promiseOverdueByMinutes') ||
      table?.visibleColumns?.includes('promiseOverdueByMinutes') ||
      table?.columnOrder?.includes('promiseOverdueByMinutes') ||
      board?.visibleFields?.includes('promiseOverdueByMinutes') ||
      progress?.visibleFields?.includes('promiseOverdueByMinutes')
    if (!hasOld) return

    const replace = (keys: string[]) =>
      replaceKeyInFieldList(keys, 'promiseOverdueByMinutes', 'overdueTimeLabel')
    preferences.value = {
      ...preferences.value!,
      stylePreferences: {
        ...sp,
        card: card
          ? {
              ...card,
              visibleFields: replace(card.visibleFields ?? []),
              fieldOrder: replace(card.fieldOrder ?? []),
            }
          : sp.card,
        table: table
          ? {
              ...table,
              visibleColumns: replace(table.visibleColumns ?? []),
              columnOrder: replace(table.columnOrder ?? []),
            }
          : sp.table,
        board: board
          ? { ...board, visibleFields: replace(board.visibleFields ?? []) }
          : sp.board,
        progress: progress
          ? { ...progress, visibleFields: replace(progress.visibleFields ?? []) }
          : sp.progress,
      },
    }
    savePreferencesDebounced()
  }

  /** Replace deprecated timeUntilPromiseLabel with timeUntilDueLabel in column/field lists. */
  function migrateTimeUntilPromiseToTimeUntilDue(): void {
    if (!preferences.value?.stylePreferences) return
    const sp = preferences.value.stylePreferences
    const card = sp.card
    const table = sp.table
    const board = sp.board
    const progress = sp.progress
    const hasOld =
      card?.visibleFields?.includes('timeUntilPromiseLabel') ||
      card?.fieldOrder?.includes('timeUntilPromiseLabel') ||
      table?.visibleColumns?.includes('timeUntilPromiseLabel') ||
      table?.columnOrder?.includes('timeUntilPromiseLabel') ||
      board?.visibleFields?.includes('timeUntilPromiseLabel') ||
      progress?.visibleFields?.includes('timeUntilPromiseLabel')
    if (!hasOld) return

    const replace = (keys: string[]) =>
      replaceKeyInFieldList(keys, 'timeUntilPromiseLabel', 'timeUntilDueLabel')
    preferences.value = {
      ...preferences.value!,
      stylePreferences: {
        ...sp,
        card: card
          ? {
              ...card,
              visibleFields: replace(card.visibleFields ?? []),
              fieldOrder: replace(card.fieldOrder ?? []),
            }
          : sp.card,
        table: table
          ? {
              ...table,
              visibleColumns: replace(table.visibleColumns ?? []),
              columnOrder: replace(table.columnOrder ?? []),
            }
          : sp.table,
        board: board
          ? { ...board, visibleFields: replace(board.visibleFields ?? []) }
          : sp.board,
        progress: progress
          ? { ...progress, visibleFields: replace(progress.visibleFields ?? []) }
          : sp.progress,
      },
    }
    savePreferencesDebounced()
  }

  /** Replace legacy totalTimeInService* keys with serviceCycleTime* across fields and filters. */
  function migrateTotalTimeInServiceToServiceCycleTime(): void {
    if (!preferences.value) return
    const currentPrefs = preferences.value
    const sp = currentPrefs.stylePreferences
    const card = sp.card
    const table = sp.table
    const board = sp.board
    const progress = sp.progress

    const replaceFieldKey = (keys: string[]) =>
      replaceKeyInFieldList(keys, 'totalTimeInServiceLabel', 'serviceCycleTimeLabel')

    const styleHasOldKey =
      card?.visibleFields?.includes('totalTimeInServiceLabel') ||
      card?.fieldOrder?.includes('totalTimeInServiceLabel') ||
      table?.visibleColumns?.includes('totalTimeInServiceLabel') ||
      table?.columnOrder?.includes('totalTimeInServiceLabel') ||
      board?.visibleFields?.includes('totalTimeInServiceLabel') ||
      progress?.visibleFields?.includes('totalTimeInServiceLabel')

    const migrateFilters = (filters: TicketFilters): TicketFilters => {
      const value = (filters as TicketFilters & { totalTimeInServiceAtLeastMinutes?: number })
        .totalTimeInServiceAtLeastMinutes
      if (value == null) return filters
      const next = { ...filters } as TicketFilters & { totalTimeInServiceAtLeastMinutes?: number }
      next.serviceCycleTimeAtLeastMinutes = value
      delete next.totalTimeInServiceAtLeastMinutes
      return next
    }

    let filtersChanged = false
    const nextLastUsedFilters = migrateFilters(currentPrefs.lastUsedFilters)
    if (nextLastUsedFilters !== currentPrefs.lastUsedFilters) filtersChanged = true

    let presetChanged = false
    const nextPresets = currentPrefs.filterPresets.map((preset) => {
      const nextFilters = migrateFilters(preset.filters)
      const nextTableConfig = preset.tableConfig
        ? {
            ...preset.tableConfig,
            visibleColumns: replaceFieldKey(preset.tableConfig.visibleColumns ?? []),
            columnOrder: replaceFieldKey(preset.tableConfig.columnOrder ?? []),
          }
        : preset.tableConfig
      const nextCardConfig = preset.cardConfig
        ? {
            ...preset.cardConfig,
            visibleFields: replaceFieldKey(preset.cardConfig.visibleFields ?? []),
            fieldOrder: replaceFieldKey(preset.cardConfig.fieldOrder ?? []),
          }
        : preset.cardConfig
      const nextProgressConfig = preset.progressConfig
        ? {
            ...preset.progressConfig,
            visibleFields: replaceFieldKey(preset.progressConfig.visibleFields ?? []),
          }
        : preset.progressConfig

      const changed =
        nextFilters !== preset.filters ||
        nextTableConfig !== preset.tableConfig ||
        nextCardConfig !== preset.cardConfig ||
        nextProgressConfig !== preset.progressConfig

      if (!changed) return preset
      presetChanged = true
      return {
        ...preset,
        filters: nextFilters,
        tableConfig: nextTableConfig,
        cardConfig: nextCardConfig,
        progressConfig: nextProgressConfig,
      }
    })

    if (!styleHasOldKey && !filtersChanged && !presetChanged) return

    preferences.value = {
      ...currentPrefs,
      stylePreferences: {
        ...sp,
        card: card
          ? {
              ...card,
              visibleFields: replaceFieldKey(card.visibleFields ?? []),
              fieldOrder: replaceFieldKey(card.fieldOrder ?? []),
            }
          : sp.card,
        table: table
          ? {
              ...table,
              visibleColumns: replaceFieldKey(table.visibleColumns ?? []),
              columnOrder: replaceFieldKey(table.columnOrder ?? []),
            }
          : sp.table,
        board: board
          ? { ...board, visibleFields: replaceFieldKey(board.visibleFields ?? []) }
          : sp.board,
        progress: progress
          ? { ...progress, visibleFields: replaceFieldKey(progress.visibleFields ?? []) }
          : sp.progress,
      },
      filterPresets: nextPresets,
      lastUsedFilters: nextLastUsedFilters,
    }
    savePreferencesDebounced()
  }

  /**
   * Ensure progress.visibleFields stays aligned with table.visibleColumns so that
   * the Progress view shares the same field selection as Table/Cards.
   */
  function normalizeProgressFieldsToTable(): void {
    if (!preferences.value?.stylePreferences) return
    const sp = preferences.value.stylePreferences
    const tableColumns = sp.table.visibleColumns ?? []
    const progressFields = sp.progress.visibleFields ?? []
    const isDifferent =
      tableColumns.length !== progressFields.length ||
      tableColumns.some((key, idx) => key !== progressFields[idx])

    if (!isDifferent) return

    preferences.value = {
      ...preferences.value,
      stylePreferences: {
        ...sp,
        progress: {
          ...sp.progress,
          visibleFields: [...tableColumns],
        },
      },
    }
    savePreferencesDebounced()
  }

  function migrateBoardStyleIfNeeded(): void {
    const style = preferences.value?.stylePreferences?.defaultStyle as string | undefined
    if (style !== 'board') return
    const boardTabulateBy = preferences.value?.stylePreferences?.board?.tabulateBy ?? 'vehicleStatus'
    preferences.value = {
      ...preferences.value!,
      stylePreferences: {
        ...preferences.value!.stylePreferences,
        defaultStyle: 'table',
      },
      lastUsedFilters: {
        ...preferences.value!.lastUsedFilters,
        tabulateBy: boardTabulateBy,
      },
    }
    savePreferencesDebounced()
  }

  function migrateLegacyInspectionTabulateBy(): void {
    if (!preferences.value) return

    const legacyInspectionDims = new Set(['inspectionViewed', 'inspectionStarted', 'inspectionComplete'])
    const currentPrefs = preferences.value
    const currentBoardTabulateBy = currentPrefs.stylePreferences?.board?.tabulateBy as string | undefined
    const currentLastUsedTabulateBy = currentPrefs.lastUsedFilters?.tabulateBy as string | undefined

    let changed = false
    const nextPresets = currentPrefs.filterPresets.map((preset) => {
      const presetTabulateBy = preset.filters?.tabulateBy as string | undefined
      if (!legacyInspectionDims.has(presetTabulateBy ?? '')) return preset
      changed = true
      return {
        ...preset,
        filters: {
          ...preset.filters,
          tabulateBy: 'inspectionStatus' as TabulationDimension,
        },
      }
    })

    const nextBoardTabulateBy = legacyInspectionDims.has(currentBoardTabulateBy ?? '')
      ? ('inspectionStatus' as TabulationDimension)
      : currentPrefs.stylePreferences.board.tabulateBy
    const nextLastUsedTabulateBy = legacyInspectionDims.has(currentLastUsedTabulateBy ?? '')
      ? ('inspectionStatus' as TabulationDimension)
      : currentPrefs.lastUsedFilters.tabulateBy

    if (nextBoardTabulateBy !== currentPrefs.stylePreferences.board.tabulateBy) changed = true
    if (nextLastUsedTabulateBy !== currentPrefs.lastUsedFilters.tabulateBy) changed = true
    if (!changed) return

    preferences.value = {
      ...currentPrefs,
      filterPresets: nextPresets,
      stylePreferences: {
        ...currentPrefs.stylePreferences,
        board: {
          ...currentPrefs.stylePreferences.board,
          tabulateBy: nextBoardTabulateBy,
        },
      },
      lastUsedFilters: {
        ...currentPrefs.lastUsedFilters,
        tabulateBy: nextLastUsedTabulateBy,
      },
    }
    savePreferencesDebounced()
  }

  /**
   * Initialize preferences from API or localStorage
   */
  async function initialize(): Promise<void> {
    if (isInitialized.value) return
    
    isLoading.value = true
    error.value = null
    
    try {
      if (import.meta.env.DEV) {
        await loadDevUserContext()
      }
      const response = await fetchUserPreferences()
      if (response.success && response.data) {
        preferences.value = response.data
        normalizeScopedPresets(preferences.value)
        const runtimeCtx = readRuntimeUserContext()
        await bootstrapIndexedDbPresets(preferences.value.filterPresets, toIndexedPresetContext(runtimeCtx))
        const indexedDbPresets = await listIndexedDbPresets(toIndexedPresetContext(runtimeCtx))
        if (indexedDbPresets.length > 0) {
          preferences.value.filterPresets = indexedDbPresets
        }
        migrateBoardStyleIfNeeded()
        migrateLegacyInspectionTabulateBy()
        migrateIsAgingTicketToReadyForLabel()
        migratePromiseOverdueToOverdueTime()
        migrateTimeUntilPromiseToTimeUntilDue()
        migrateTotalTimeInServiceToServiceCycleTime()
        mergeTicketActionVisibilityAndMigrateNextStep()
        migrateActionsDisplayField()
        normalizeProgressFieldsToTable()
      } else {
        preferences.value = getDefaultUserPreferences()
        normalizeScopedPresets(preferences.value)
        const runtimeCtx = readRuntimeUserContext()
        await bootstrapIndexedDbPresets(preferences.value.filterPresets, toIndexedPresetContext(runtimeCtx))
        const indexedDbPresets = await listIndexedDbPresets(toIndexedPresetContext(runtimeCtx))
        if (indexedDbPresets.length > 0) {
          preferences.value.filterPresets = indexedDbPresets
        }
        if (response.error) {
          console.warn('Failed to fetch preferences:', response.error)
        }
        migrateBoardStyleIfNeeded()
        migrateLegacyInspectionTabulateBy()
        migrateIsAgingTicketToReadyForLabel()
        migratePromiseOverdueToOverdueTime()
        migrateTimeUntilPromiseToTimeUntilDue()
        migrateTotalTimeInServiceToServiceCycleTime()
        mergeTicketActionVisibilityAndMigrateNextStep()
        migrateActionsDisplayField()
        normalizeProgressFieldsToTable()
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to initialize preferences'
      preferences.value = getDefaultUserPreferences()
      normalizeScopedPresets(preferences.value)
      const runtimeCtx = readRuntimeUserContext()
      await bootstrapIndexedDbPresets(preferences.value.filterPresets, toIndexedPresetContext(runtimeCtx))
      const indexedDbPresets = await listIndexedDbPresets(toIndexedPresetContext(runtimeCtx))
      if (indexedDbPresets.length > 0) {
        preferences.value.filterPresets = indexedDbPresets
      }
      migrateBoardStyleIfNeeded()
      migrateLegacyInspectionTabulateBy()
      migrateIsAgingTicketToReadyForLabel()
      migratePromiseOverdueToOverdueTime()
      migrateTimeUntilPromiseToTimeUntilDue()
      migrateTotalTimeInServiceToServiceCycleTime()
      mergeTicketActionVisibilityAndMigrateNextStep()
      migrateActionsDisplayField()
      normalizeProgressFieldsToTable()
    } finally {
      if (preferences.value) {
        mergeSystemTicketPresets(preferences.value, savePreferencesDebounced)
      }
      isLoading.value = false
      isInitialized.value = true
    }
  }

  /**
   * Save preferences (debounced)
   */
  function savePreferencesDebounced(): void {
    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer)
    }
    
    saveDebounceTimer = setTimeout(async () => {
      if (!preferences.value) return
      
      try {
        // Save to localStorage immediately for instant persistence
        savePreferencesToLocalStorage(preferences.value)
        
        // Try to save to API
        const response = await saveUserPreferences(preferences.value)
        if (!response.success) {
          console.warn('Failed to save preferences to API:', response.error)
        }
      } catch (err: any) {
        console.error('Error saving preferences:', err)
      }
    }, SAVE_DEBOUNCE_MS)
  }

  /**
   * Update the current style
   */
  function setCurrentStyle(style: TicketStyle): void {
    if (!preferences.value) {
      preferences.value = getDefaultUserPreferences()
    }
    preferences.value.stylePreferences.defaultStyle = style
    savePreferencesDebounced()
  }

  /**
   * Update card style configuration
   */
  function updateCardConfig(config: Partial<CardStyleConfig>): void {
    if (!preferences.value) {
      preferences.value = getDefaultUserPreferences()
    }
    preferences.value.stylePreferences.card = {
      ...preferences.value.stylePreferences.card,
      ...config,
    }
    savePreferencesDebounced()
  }

  /**
   * Update table style configuration
   */
  function updateTableConfig(config: Partial<TableStyleConfig>): void {
    if (!preferences.value) {
      preferences.value = getDefaultUserPreferences()
    }
    preferences.value.stylePreferences.table = {
      ...preferences.value.stylePreferences.table,
      ...config,
    }
    savePreferencesDebounced()
  }

  /**
   * Update board style configuration
   */
  function updateBoardConfig(config: Partial<BoardStyleConfig>): void {
    if (!preferences.value) {
      preferences.value = getDefaultUserPreferences()
    }
    preferences.value.stylePreferences.board = {
      ...preferences.value.stylePreferences.board,
      ...config,
    }
    savePreferencesDebounced()
  }

  function updateTicketActionVisibility(partial: Partial<TicketActionVisibility>): void {
    if (!preferences.value) {
      preferences.value = getDefaultUserPreferences()
    }
    const cur = preferences.value.stylePreferences.ticketActionVisibility ?? {
      ...DEFAULT_TICKET_ACTION_VISIBILITY,
    }
    preferences.value.stylePreferences.ticketActionVisibility = {
      ...cur,
      ...partial,
    }
    savePreferencesDebounced()
  }

  /**
   * Update progress style configuration
   */
  function updateProgressConfig(
    config: Partial<ProgressStyleConfig> & { skipTableCardSync?: boolean }
  ): void {
    if (!preferences.value) {
      preferences.value = getDefaultUserPreferences()
    }
    const { skipTableCardSync, ...progressPatch } = config
    const nextProgress: ProgressStyleConfig = {
      ...preferences.value.stylePreferences.progress,
      ...progressPatch,
    }
    const table = preferences.value.stylePreferences.table
    if (progressPatch.visibleFields !== undefined) {
      if (skipTableCardSync) {
        preferences.value.stylePreferences = {
          ...preferences.value.stylePreferences,
          progress: nextProgress,
        }
      } else {
        // Keep progress.visibleFields aligned with table visibleColumns when callers only
        // pass a subset of keys (e.g. sortBy). If visibleFields is provided explicitly,
        // treat it as the new canonical list for all styles.
        preferences.value.stylePreferences = {
          ...preferences.value.stylePreferences,
          table: {
            ...table,
            visibleColumns: [...progressPatch.visibleFields],
          },
          card: {
            ...preferences.value.stylePreferences.card,
            visibleFields: [...progressPatch.visibleFields],
            fieldOrder: [...progressPatch.visibleFields],
          },
          progress: nextProgress,
        }
      }
    } else {
      preferences.value.stylePreferences.progress = {
        ...nextProgress,
        visibleFields: [...table.visibleColumns],
      }
    }
    savePreferencesDebounced()
  }

  /**
   * Set board tabulation dimension
   */
  function setBoardTabulateBy(dimension: TabulationDimension): void {
    updateBoardConfig({ tabulateBy: dimension })
  }

  /**
   * Set board content format
   */
  function setBoardContentFormat(format: 'table' | 'cards'): void {
    updateBoardConfig({ contentFormat: format })
  }

  /**
   * Update last used filters
   */
  function setLastUsedFilters(filters: TicketFilters): void {
    if (!preferences.value) {
      preferences.value = getDefaultUserPreferences()
    }
    preferences.value.lastUsedFilters = { ...filters }
    savePreferencesDebounced()
  }

  /**
   * Create a preset object with a local id (for localStorage or API fallback).
   * Captures a snapshot of the current field configuration so presets can restore fields.
   */
  function createLocalPreset(
    name: string,
    filters: TicketFilters,
    style: TicketStyle,
    isDefault = false,
    scope: PresetScope = 'user'
  ): FilterPreset {
    const sp = preferences.value?.stylePreferences ?? DEFAULT_STYLE_PREFERENCES
    const ctx = readRuntimeUserContext()
    return {
      id: Date.now(),
      name,
      filters: { ...filters },
      style,
      isDefault,
      scope,
      isSystemPreset: scope === 'system',
      customerId: scope === 'company' ? ctx.customerId : undefined,
      ownerUserName: scope === 'user' ? ctx.userName : undefined,
      tableConfig: {
        visibleColumns: [...sp.table.visibleColumns],
        columnOrder: [...sp.table.columnOrder],
      },
      cardConfig: {
        visibleFields: [...sp.card.visibleFields],
        fieldOrder: [...sp.card.fieldOrder],
      },
      progressConfig: {
        visibleFields: [...sp.progress.visibleFields],
        sortBy: sp.progress.sortBy,
      },
    }
  }

  /**
   * Add a new filter preset. Persists to localStorage immediately; API is tried for future backend sync.
   */
  async function addFilterPreset(
    name: string,
    filters: TicketFilters,
    scope: PresetScope = 'user'
  ): Promise<FilterPreset | null> {
    if (!preferences.value) {
      preferences.value = getDefaultUserPreferences()
    }

    const ctx = readRuntimeUserContext()
    const styleForPreset: TicketStyle =
      (preferences.value?.stylePreferences?.defaultStyle as TicketStyle | undefined) ??
      DEFAULT_STYLE_PREFERENCES.defaultStyle

    try {
      const createPayload: Omit<FilterPreset, 'id'> = {
        name,
        filters,
        style: styleForPreset,
        scope,
        isSystemPreset: scope === 'system',
        customerId: scope === 'company' ? ctx.customerId : undefined,
        ownerUserName: scope === 'user' ? ctx.userName : undefined,
      }
      const response = await createFilterPreset(createPayload)
      const basePreset = response.success && response.preset
        ? response.preset
        : createLocalPreset(name, filters, styleForPreset, false, scope)

      const sp = preferences.value.stylePreferences
      const normalizedPreset: FilterPreset = normalizePresetForScope({
        ...basePreset,
        style: basePreset.style ?? styleForPreset,
        tableConfig: basePreset.tableConfig ?? {
          visibleColumns: [...sp.table.visibleColumns],
          columnOrder: [...sp.table.columnOrder],
        },
        cardConfig: basePreset.cardConfig ?? {
          visibleFields: [...sp.card.visibleFields],
          fieldOrder: [...sp.card.fieldOrder],
        },
        progressConfig: {
          visibleFields:
            basePreset.progressConfig?.visibleFields ?? [...sp.progress.visibleFields],
          sortBy: basePreset.progressConfig?.sortBy ?? sp.progress.sortBy,
        },
      }, ctx)
      const persistedPreset = await saveIndexedDbPreset(normalizedPreset, toIndexedPresetContext(ctx))
      preferences.value.filterPresets.push(persistedPreset)
      savePreferencesDebounced()
      return persistedPreset
    } catch (err) {
      console.error('Error creating filter preset:', err)
      const preset = createLocalPreset(name, filters, styleForPreset, false, scope)
      const persistedPreset = await saveIndexedDbPreset(preset, toIndexedPresetContext(ctx))
      preferences.value.filterPresets.push(persistedPreset)
      savePreferencesDebounced()
      return persistedPreset
    }
  }

  /**
   * Update an existing filter preset.
   * Updates local state immediately so the UI reflects the change; then persists (localStorage + API).
   */
  async function saveFilterPreset(preset: FilterPreset): Promise<boolean> {
    if (!preferences.value) return false

    const index = preferences.value.filterPresets.findIndex((p) => idEquals(p.id, preset.id))
    if (index === -1) return false

    // Apply the user's edit to local state first so the UI updates regardless of API result
    const ctx = readRuntimeUserContext()
    const persisted = await saveIndexedDbPreset(preset, toIndexedPresetContext(ctx))
    const updated = { ...persisted }
    preferences.value = {
      ...preferences.value,
      filterPresets: preferences.value.filterPresets.map((p, i) =>
        i === index ? updated : p
      ),
    }
    savePreferencesDebounced()

    try {
      const response = await updateFilterPreset(preset)
      if (!response.success) {
        console.warn('Failed to update preset on server:', response.error)
      }
    } catch (err) {
      console.error('Error updating filter preset:', err)
    }
    return true
  }

  /**
   * Remove a filter preset. Always updates localStorage; API is tried for future backend sync.
   */
  async function removeFilterPreset(
    presetId: string | number,
    options?: { allowSystemPresetDeletion?: boolean }
  ): Promise<boolean> {
    if (!preferences.value) return false

    const target = preferences.value.filterPresets.find((p) => idEquals(p.id, presetId))
    if (target?.isSystemPreset && !options?.allowSystemPresetDeletion) return false

    const ctx = readRuntimeUserContext()
    await markIndexedDbPresetInactive(presetId, target?.scope, toIndexedPresetContext(ctx))

    try {
      await deleteFilterPreset(presetId)
    } catch (err) {
      console.warn('Error calling delete preset API (preset still removed locally):', err)
    }
    const before = preferences.value.filterPresets.length
    preferences.value.filterPresets = preferences.value.filterPresets.filter(
      (p) => p.id !== presetId
    )
    if (preferences.value.filterPresets.length !== before) {
      savePreferencesDebounced()
      return true
    }
    return false
  }

  /**
   * Set a preset as default
   */
  function setDefaultPreset(presetId: string | number): void {
    if (!preferences.value) return
    
    const ctx = readRuntimeUserContext()
    void setIndexedDbDefaultPreset(presetId, undefined, toIndexedPresetContext(ctx))

    preferences.value.filterPresets.forEach(preset => {
      preset.isDefault = idEquals(preset.id, presetId)
    })
    savePreferencesDebounced()
  }

  /**
   * Get the default preset
   */
  const defaultPreset = computed(() => 
    filterPresets.value.find(p => p.isDefault) || null
  )

  /**
   * Apply a preset to filters
   */
  function applyPreset(presetId: string | number): TicketFilters | null {
    const preset = filterPresets.value.find((p) => idEquals(p.id, presetId))
    if (preset) {
      if (!preferences.value) {
        preferences.value = getDefaultUserPreferences()
      }

      // Restore style + field configuration snapshot when available
      const sp = preferences.value!.stylePreferences
      const nextTable =
        preset.tableConfig ??
        {
          visibleColumns: [...sp.table.visibleColumns],
          columnOrder: [...sp.table.columnOrder],
        }
      const nextVisibleColumns = [...nextTable.visibleColumns]
      const cardVisible =
        preset.cardConfig?.visibleFields ?? nextVisibleColumns
      const cardFieldOrder =
        preset.cardConfig?.fieldOrder ?? cardVisible
      const progressVisible =
        preset.progressConfig?.visibleFields ?? nextVisibleColumns

      preferences.value = {
        ...preferences.value!,
        stylePreferences: {
          ...sp,
          defaultStyle: preset.style ?? sp.defaultStyle,
          table: {
            ...sp.table,
            visibleColumns: nextVisibleColumns,
            columnOrder: [...(preset.tableConfig?.columnOrder ?? sp.table.columnOrder)],
          },
          card: {
            ...sp.card,
            visibleFields: [...cardVisible],
            fieldOrder: [...cardFieldOrder],
          },
          progress: {
            ...sp.progress,
            visibleFields: [...progressVisible],
            sortBy: preset.progressConfig?.sortBy ?? sp.progress.sortBy,
          },
          board: sp.board,
        },
      }
      setLastUsedFilters(preset.filters)
      return preset.filters
    }
    return null
  }

  /**
   * Toggle column/field visibility
   */
  function toggleColumnVisibility(style: TicketStyle, fieldKey: string): void {
    if (!preferences.value) {
      preferences.value = getDefaultUserPreferences()
    }
    
    const config = preferences.value.stylePreferences[style]
    const fieldArray = style === 'table' 
      ? (config as TableStyleConfig).visibleColumns 
      : (config as CardStyleConfig | BoardStyleConfig | ProgressStyleConfig).visibleFields
    
    const index = fieldArray.indexOf(fieldKey)
    if (index > -1) {
      fieldArray.splice(index, 1)
    } else {
      fieldArray.push(fieldKey)
    }
    
    savePreferencesDebounced()
  }

  /**
   * Reorder columns/fields
   */
  function reorderFields(style: TicketStyle, newOrder: string[]): void {
    if (!preferences.value) {
      preferences.value = getDefaultUserPreferences()
    }
    
    if (style === 'table') {
      preferences.value.stylePreferences.table.columnOrder = newOrder
    } else if (style === 'card') {
      preferences.value.stylePreferences.card.fieldOrder = newOrder
    }
    
    savePreferencesDebounced()
  }

  /**
   * Reset preferences to defaults
   */
  function resetToDefaults(): void {
    preferences.value = getDefaultUserPreferences()
    savePreferencesDebounced()
  }

  return {
    // State
    preferences,
    isLoading,
    error,
    isInitialized,
    
    // Computed
    stylePreferences,
    filterPresets,
    lastUsedFilters,
    currentStyle,
    cardConfig,
    tableConfig,
    boardConfig,
    progressConfig,
    ticketActionVisibility,
    defaultPreset,
    
    // Methods
    initialize,
    setCurrentStyle,
    updateCardConfig,
    updateTableConfig,
    updateBoardConfig,
    updateProgressConfig,
    updateTicketActionVisibility,
    setBoardTabulateBy,
    setBoardContentFormat,
    setLastUsedFilters,
    addFilterPreset,
    saveFilterPreset,
    removeFilterPreset,
    setDefaultPreset,
    applyPreset,
    toggleColumnVisibility,
    reorderFields,
    resetToDefaults,
  }
}
