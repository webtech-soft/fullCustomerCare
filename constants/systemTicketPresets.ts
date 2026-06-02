import type { FilterPreset, ProgressSortOption, TicketFilters } from '@/types/ticket'
import { DEFAULT_FILTERS } from '@/types/ticket'

/** Shared column order for built-in presets 2–3 (includes Overdue Status). */
export const SYSTEM_PRESET_TABLE_COLUMNS = [
  'ticketNumber',
  'type',
  'date',
  'total',
  'salesrep',
  'technician',
  'statusFlags',
  'name',
  'vehicle',
  'vehicleStatus',
  'actions',
] as const

/** All tickets preset: same as shared list but without Overdue Status (`statusFlags`). */
export const ALL_TICKETS_SYSTEM_PRESET_COLUMNS = [
  'ticketNumber',
  'type',
  'date',
  'total',
  'salesrep',
  'technician',
  'name',
  'vehicle',
  'vehicleStatus',
  'actions',
] as const

export const ALL_TICKETS_SYSTEM_PRESET_ID = 'system-preset-all-tickets'

function snapshotForPreset(
  sortBy: ProgressSortOption,
  columnKeys: readonly string[] = SYSTEM_PRESET_TABLE_COLUMNS
): Pick<FilterPreset, 'tableConfig' | 'cardConfig' | 'progressConfig'> {
  const cols = [...columnKeys]
  return {
    tableConfig: { visibleColumns: cols, columnOrder: cols },
    cardConfig: { visibleFields: cols, fieldOrder: cols },
    progressConfig: { visibleFields: cols, sortBy },
  }
}

const FILTERS_ALL_TYPES_TODAY: TicketFilters = {
  ...DEFAULT_FILTERS,
  workorder: true,
  invoice: true,
  batch: true,
  quote: true,
  tabulateBy: 'ticketType',
}

const FILTERS_OVERDUE_VIEW: TicketFilters = {
  ...DEFAULT_FILTERS,
  tabulateBy: 'overdueStatus',
}

// ── Column lists for new system presets ──────────────────────────────────────

const CUSTOMER_APPROVALS_COLUMNS = [
  'ticketNumber',
  'name',
  'phone',
  'vehicle',
  'vehicleStatus',
  'approvedStatus',
  'technician',
  'promisedTime',
  'timeUntilDueLabel',
  'actions',
] as const

const AWAITING_CALLBACK_COLUMNS = [
  'ticketNumber',
  'name',
  'phone',
  'vehicle',
  'vehicleStatus',
  'approvedStatus',
  'promisedTime',
  'timeUntilDueLabel',
  'technician',
  'actions',
] as const

const SHOP_FLOOR_COLUMNS = [
  'ticketNumber',
  'name',
  'vehicle',
  'vehicleStatus',
  'technician',
  'bay',
  'timeSinceCheckInLabel',
  'promisedTime',
  'timeUntilDueLabel',
  'statusFlags',
  'actions',
] as const

const READY_FOR_PICKUP_COLUMNS = [
  'ticketNumber',
  'name',
  'phone',
  'vehicle',
  'vehicleStatus',
  'readyForLabel',
  'total',
  'viewedStatus',
  'approvedStatus',
  'actions',
] as const

const OVERDUE_URGENT_COLUMNS = [
  'ticketNumber',
  'name',
  'phone',
  'vehicle',
  'vehicleStatus',
  'overdueTimeLabel',
  'promisedTime',
  'technician',
  'statusFlags',
  'actions',
] as const

const INSPECTION_PIPELINE_COLUMNS = [
  'ticketNumber',
  'name',
  'vehicle',
  'vehicleStatus',
  'technician',
  'inspectionStatus',
  'inspectionCompletionLabel',
  'approvedStatus',
  'actions',
] as const

const TECHNICIAN_WORKLOAD_COLUMNS = [
  'ticketNumber',
  'name',
  'vehicle',
  'vehicleStatus',
  'technician',
  'inspectionStatus',
  'promisedTime',
  'timeUntilDueLabel',
  'actions',
] as const

const QUOTES_PIPELINE_COLUMNS = [
  'ticketNumber',
  'date',
  'name',
  'phone',
  'vehicle',
  'total',
  'viewedStatus',
  'approvedStatus',
  'actions',
] as const

const GP_PERFORMANCE_COLUMNS = [
  'ticketNumber',
  'type',
  'date',
  'name',
  'salesrep',
  'technician',
  'total',
  'subtotal',
  'cost',
  'gpPercent',
  'actions',
] as const

/** Canonical system presets merged into user preferences when missing (stable ids). */
export const SYSTEM_TICKET_PRESETS: FilterPreset[] = [
  {
    id: ALL_TICKETS_SYSTEM_PRESET_ID,
    name: 'All tickets',
    isSystemPreset: true,
    isDefault: false,
    style: 'table',
    filters: { ...DEFAULT_FILTERS },
    ...snapshotForPreset('readyFirst', ALL_TICKETS_SYSTEM_PRESET_COLUMNS),
  },
  {
    id: 'system-preset-all-tickets-by-type',
    name: 'All Tickets by Type',
    isSystemPreset: true,
    isDefault: false,
    style: 'table',
    filters: { ...FILTERS_ALL_TYPES_TODAY },
    ...snapshotForPreset('readyFirst'),
  },
  {
    id: 'system-preset-overdue-tickets',
    name: 'Overdue Tickets',
    isSystemPreset: true,
    isDefault: false,
    style: 'table',
    filters: { ...FILTERS_OVERDUE_VIEW },
    ...snapshotForPreset('overdueTimeDesc'),
  },
  // ── Approval Status presets ───────────────────────────────────────────────
  {
    id: 'system-preset-customer-approvals',
    name: 'Customer Approvals',
    isSystemPreset: true,
    isDefault: false,
    style: 'table',
    filters: {
      ...DEFAULT_FILTERS,
      workorder: true,
      invoice: false,
      batch: false,
      quote: false,
      tabulateBy: 'approvedStatus',
    },
    ...snapshotForPreset('approvedStatusApprovedFirst', CUSTOMER_APPROVALS_COLUMNS),
  },
  {
    id: 'system-preset-awaiting-callback',
    name: 'Awaiting Callback',
    isSystemPreset: true,
    isDefault: false,
    style: 'table',
    filters: {
      ...DEFAULT_FILTERS,
      workorder: true,
      invoice: false,
      batch: false,
      quote: false,
      status: 'Awaiting Callback',
      tabulateBy: 'approvedStatus',
    },
    ...snapshotForPreset('timeUntilDueAsc', AWAITING_CALLBACK_COLUMNS),
  },
  // ── Operational efficiency presets ───────────────────────────────────────
  {
    id: 'system-preset-shop-floor',
    name: 'Shop Floor Status',
    isSystemPreset: true,
    isDefault: false,
    style: 'table',
    filters: {
      ...DEFAULT_FILTERS,
      workorder: true,
      invoice: false,
      batch: false,
      quote: false,
      tabulateBy: 'vehicleStatus',
    },
    ...snapshotForPreset('timeSinceCheckInDesc', SHOP_FLOOR_COLUMNS),
  },
  {
    id: 'system-preset-ready-for-pickup',
    name: 'Ready for Pickup',
    isSystemPreset: true,
    isDefault: false,
    style: 'table',
    filters: {
      ...DEFAULT_FILTERS,
      workorder: true,
      invoice: false,
      batch: false,
      quote: false,
      status: 'Ready',
    },
    ...snapshotForPreset('readyForDesc', READY_FOR_PICKUP_COLUMNS),
  },
  {
    id: 'system-preset-overdue-urgent',
    name: 'Overdue & Urgent',
    isSystemPreset: true,
    isDefault: false,
    style: 'progress',
    filters: {
      ...DEFAULT_FILTERS,
      workorder: true,
      invoice: false,
      batch: false,
      quote: false,
      onlyOverdue: true,
    },
    ...snapshotForPreset('overdueTimeDesc', OVERDUE_URGENT_COLUMNS),
  },
  {
    id: 'system-preset-inspection-pipeline',
    name: 'Inspection Pipeline',
    isSystemPreset: true,
    isDefault: false,
    style: 'progress',
    filters: {
      ...DEFAULT_FILTERS,
      workorder: true,
      invoice: false,
      batch: false,
      quote: false,
      tabulateBy: 'inspectionStatus',
    },
    ...snapshotForPreset('timeSinceCheckInDesc', INSPECTION_PIPELINE_COLUMNS),
  },
  // ── Customization / role-based presets ───────────────────────────────────
  {
    id: 'system-preset-technician-workload',
    name: 'Technician Workload',
    isSystemPreset: true,
    isDefault: false,
    style: 'card',
    filters: {
      ...DEFAULT_FILTERS,
      workorder: true,
      invoice: false,
      batch: false,
      quote: false,
      tabulateBy: 'technician',
    },
    ...snapshotForPreset('readyFirst', TECHNICIAN_WORKLOAD_COLUMNS),
  },
  {
    id: 'system-preset-quotes-pipeline',
    name: 'Quotes Pipeline',
    isSystemPreset: true,
    isDefault: false,
    style: 'table',
    filters: {
      ...DEFAULT_FILTERS,
      workorder: false,
      invoice: false,
      batch: false,
      quote: true,
      dateRange: 'This Week',
      tabulateBy: 'viewedStatus',
    },
    ...snapshotForPreset('totalDesc', QUOTES_PIPELINE_COLUMNS),
  },
  {
    id: 'system-preset-gp-performance',
    name: 'GP Performance',
    isSystemPreset: true,
    isDefault: false,
    style: 'table',
    filters: {
      ...DEFAULT_FILTERS,
      workorder: true,
      invoice: true,
      batch: false,
      quote: false,
      tabulateBy: 'salesRep',
    },
    ...snapshotForPreset('gpPercentAsc', GP_PERFORMANCE_COLUMNS),
  },
]
