export type TicketType = "W" | "I" | "B" | "Q" // Workorder, Invoice, Batch, Quote

// Style types (board deprecated; use tabulate filter with table/cards/progress)
export type TicketStyle = 'card' | 'table' | 'progress'

// Board tabulation dimensions
export type TabulationDimension =
  | 'ticketType'
  | 'technician'
  | 'salesRep'
  | 'vehicleStatus'
  | 'approvedStatus'
  | 'viewedStatus'
  | 'overdueStatus'
  | 'inspectionStatus'

export type ProgressSortOption =
  | 'readyFirst'
  | 'readyLast'
  | 'ticketNumberAsc'
  | 'ticketNumberDesc'
  | 'timeUntilDueAsc'
  | 'overdueTimeDesc'
  | 'readyForDesc'
  | 'timeSinceCheckInDesc'
  | 'serviceCycleTimeDesc'
  | 'ticketAgeDesc'
  | 'promisedTimeAsc'
  | 'promisedTimeDesc'
  | 'gpPercentDesc'
  | 'gpPercentAsc'
  | 'totalDesc'
  | 'totalAsc'
  | 'technicianAsc'
  | 'technicianDesc'
  | 'salesrepAsc'
  | 'salesrepDesc'
  | 'bayAsc'
  | 'bayDesc'
  | 'viewedStatusViewedFirst'
  | 'approvedStatusApprovedFirst'

export type VehicleStatus =
  | "Not Started"
  | "Online Appointment"
  | "Not Here Yet"
  | "Check In"
  | "On Lot"
  | "In Shop"
  | "Inspection Complete"
  | "Awaiting Callback"
  | "Awaiting Parts"
  | "Out For Sublet"
  | "Ready"
  | ""

export interface Ticket {
  id: number
  ticketNumber: number
  date: string
  type: TicketType
  salesrep: string
  technician: string
  name: string
  vehicle: string
  total: number
  vehicleStatus: VehicleStatus
  inspectionStatus?: "complete" | "incomplete" | "none"
  inspectionId?: string // Format: INS-{timestamp}-{random}
  /** Promised completion or appointment time, as a raw string from the API */
  promisedTime?: string
  /** Appointment duration in minutes (from ApptDuration); used with promisedTime for due-time calculation */
  apptDurationMinutes?: number
  mileage?: number
  phone?: string
  email?: string
  // Extended fields for display customization
  autoTag?: string
  vin?: string
  subtotal?: number
  salesTax?: number
  cost?: number
  /**
   * Gross profit percentage for the ticket, on a 0–100 scale.
   * Computed client-side from subtotal and cost.
   */
  gpPercent?: number
  address?: string
  storeName?: string
  route?: string
  ticketMemo?: string
  bay?: string
  partialFill?: number
  backOrder?: number
  natAcct?: number
  printStatus?: number
  // Computed/derived fields populated on the client
  ticketAgeMinutes?: number
  ticketAgeLabel?: string
  promisedStart?: string
  promisedEnd?: string
  timeUntilPromiseMinutes?: number
  timeUntilPromiseLabel?: string
  timeUntilDueLabel?: string
  promiseOverdueByMinutes?: number
  promiseOverdueByLabel?: string
  overdueTimeLabel?: string
  readyForMinutes?: number
  readyForLabel?: string
  timeSinceCheckInMinutes?: number
  timeSinceCheckInLabel?: string
  serviceCycleTimeMinutes?: number
  serviceCycleTimeLabel?: string
  inspectionCompletionMinutes?: number
  inspectionCompletionLabel?: string
  /**
   * Main tickets tour demo only: accent the Chat or Approvals row action (brand color).
   * Inspection cues use `inspectionStatus` instead; omit for default outline buttons.
   */
  tourDemoRowActionAccent?: 'chat' | 'approvals' | null
  /** Advanced tour action-signals step: add `animate-pulse` on Chat when `tourDemoRowActionAccent === 'chat'`. */
  tourDemoChatActionPulse?: boolean
  /** Advanced tour action-signals step: Approvals uses solid green (demo contrast). */
  tourDemoApprovalsSolidGreen?: boolean
  /**
   * Advanced tour action-signals step: this row carries `data-onboarding="ticket-row-actions"`
   * (table defaults to ticket # desc—anchor follows the patched row, not array index 0).
   */
  tourDemoAdvActionSignalsAnchor?: boolean
  /** Main tickets tour demo only: invoice/view control shows as already viewed. */
  tourDemoInvoiceViewed?: boolean
}

// Per-ticket meta flags that can be provided from view/approval tracking or other sources
export interface TicketStatusMeta {
  isViewed?: boolean
  isApproved?: boolean
  inspectionViewed?: boolean
  inspectionSent?: boolean
  inspectionStarted?: boolean
  inspectionComplete?: boolean
}

// Display field category (for grouping in configurator)
export type DisplayFieldCategory = 'ticket' | 'customer' | 'vehicle' | 'scheduling' | 'routing'

export const DISPLAY_FIELD_CATEGORIES: { id: DisplayFieldCategory; label: string }[] = [
  { id: 'ticket', label: 'Ticket Information' },
  { id: 'customer', label: 'Customer Information' },
  { id: 'vehicle', label: 'Vehicle Information' },
  { id: 'scheduling', label: 'Scheduling & Time' },
  { id: 'routing', label: 'Routing & Fulfillment' },
]

// Display field configuration
export interface DisplayFieldConfig {
  key: string
  label: string
  defaultVisible: boolean
  category: DisplayFieldCategory
}

/** Ticket list/card column keys that show dollar amounts or GP%. */
export const FINANCIAL_FIELD_KEYS = ['total', 'subtotal', 'salesTax', 'cost', 'gpPercent'] as const

export type FinancialFieldKey = (typeof FINANCIAL_FIELD_KEYS)[number]

// All available display fields
export const DISPLAY_FIELDS: DisplayFieldConfig[] = [
  // Ticket Information
  { key: 'ticketNumber', label: 'Ticket #', defaultVisible: true, category: 'ticket' },
  { key: 'date', label: 'Date', defaultVisible: true, category: 'ticket' },
  { key: 'type', label: 'Ticket Type', defaultVisible: true, category: 'ticket' },
  { key: 'salesrep', label: 'Sales Rep', defaultVisible: true, category: 'ticket' },
  { key: 'technician', label: 'Technician', defaultVisible: true, category: 'ticket' },
  { key: 'statusFlags', label: 'Overdue Status', defaultVisible: true, category: 'ticket' },
  { key: 'total', label: 'Total', defaultVisible: true, category: 'ticket' },
  { key: 'subtotal', label: 'Subtotal', defaultVisible: false, category: 'ticket' },
  { key: 'salesTax', label: 'Sales Tax', defaultVisible: false, category: 'ticket' },
  { key: 'cost', label: 'Cost', defaultVisible: false, category: 'ticket' },
  { key: 'gpPercent', label: 'GP %', defaultVisible: false, category: 'ticket' },
  { key: 'ticketMemo', label: 'Memo', defaultVisible: false, category: 'ticket' },
  { key: 'bay', label: 'Bay', defaultVisible: false, category: 'ticket' },
  { key: 'viewedStatus', label: 'Viewed Status', defaultVisible: false, category: 'ticket' },
  { key: 'approvedStatus', label: 'Approved Status', defaultVisible: false, category: 'ticket' },
  { key: 'inspectionStatus', label: 'Inspection Status', defaultVisible: false, category: 'ticket' },
  { key: 'storeName', label: 'Store', defaultVisible: false, category: 'ticket' },
  { key: 'printStatus', label: 'Print Status', defaultVisible: false, category: 'ticket' },
  { key: 'actions', label: 'Actions', defaultVisible: true, category: 'ticket' },
  // Customer Information
  { key: 'name', label: 'Customer Name', defaultVisible: true, category: 'customer' },
  { key: 'phone', label: 'Phone', defaultVisible: false, category: 'customer' },
  { key: 'email', label: 'Email', defaultVisible: false, category: 'customer' },
  { key: 'address', label: 'Address', defaultVisible: false, category: 'customer' },
  // Vehicle Information
  { key: 'vehicle', label: 'Vehicle', defaultVisible: true, category: 'vehicle' },
  { key: 'autoTag', label: 'License Plate', defaultVisible: false, category: 'vehicle' },
  { key: 'vin', label: 'VIN', defaultVisible: false, category: 'vehicle' },
  { key: 'mileage', label: 'Mileage', defaultVisible: false, category: 'vehicle' },
  { key: 'vehicleStatus', label: 'Vehicle Status', defaultVisible: true, category: 'vehicle' },
  // Scheduling & Time
  { key: 'promisedTime', label: 'Appt Time', defaultVisible: false, category: 'scheduling' },
  { key: 'apptDurationMinutes', label: 'Appt Duration', defaultVisible: false, category: 'scheduling' },
  { key: 'ticketAgeLabel', label: 'Time in Service', defaultVisible: false, category: 'scheduling' },
  { key: 'timeSinceCheckInLabel', label: 'Time Since Check In', defaultVisible: false, category: 'scheduling' },
  { key: 'serviceCycleTimeLabel', label: 'Service Cycle Time', defaultVisible: false, category: 'scheduling' },
  { key: 'inspectionCompletionLabel', label: 'Time to Complete Inspection', defaultVisible: false, category: 'scheduling' },
  { key: 'timeUntilDueLabel', label: 'Time Until Due', defaultVisible: false, category: 'scheduling' },
  { key: 'overdueTimeLabel', label: 'Overdue time', defaultVisible: false, category: 'scheduling' },
  { key: 'readyForLabel', label: 'Ready For', defaultVisible: false, category: 'scheduling' },
  // Routing & Fulfillment
  { key: 'route', label: 'Route', defaultVisible: false, category: 'routing' },
  { key: 'partialFill', label: 'Partial Fill', defaultVisible: false, category: 'routing' },
  { key: 'backOrder', label: 'Back Order', defaultVisible: false, category: 'routing' },
  { key: 'natAcct', label: 'National Account', defaultVisible: false, category: 'routing' },
]

// Filter preset
export interface FilterPreset {
  id: string | number
  name: string
  filters: TicketFilters
  scope?: PresetScope
  customerId?: string
  ownerUserName?: string
  ownerCanEdit?: boolean
  ownerCanDelete?: boolean
  /**
   * Reserved for future backend-defined presets.
   * Current frontend-only phase treats all presets as user-created.
   */
  isSystemPreset?: boolean
  /**
   * Preferred style (table/card/progress) when this preset was created.
   * Optional for backwards compatibility with existing stored presets.
   */
  style?: TicketStyle
  isDefault?: boolean
  /**
   * Optional snapshot of field/column configuration when the preset was saved.
   * These are intentionally narrow to avoid coupling to every style preference.
   */
  tableConfig?: {
    visibleColumns: string[]
    columnOrder: string[]
  }
  cardConfig?: {
    visibleFields: string[]
    fieldOrder: string[]
  }
  progressConfig?: {
    visibleFields: string[]
    sortBy?: ProgressSortOption
  }
}

export type PresetScope = 'system' | 'company' | 'user'

// Style configuration interfaces
export interface CardStyleConfig {
  visibleFields: string[]
  fieldOrder: string[]
  defaultSort: { field: string; direction: 'asc' | 'desc' }
}

export interface TableStyleConfig {
  visibleColumns: string[]
  columnOrder: string[]
  defaultSort: { column: string; direction: 'asc' | 'desc' }
}

export interface BoardStyleConfig {
  tabulateBy: TabulationDimension
  contentFormat: 'table' | 'cards'
  visibleFields: string[]
}

export interface ProgressStyleConfig {
  visibleFields: string[]
  sortBy?: ProgressSortOption
}

/** Row action buttons on tickets (table, progress, cards); not filter presets. */
export interface TicketActionVisibility {
  view: boolean
  chat: boolean
  timeline: boolean
  approvals: boolean
  inspection: boolean
  nextStep: boolean
  technicianWorksheet: boolean
}

export const DEFAULT_TICKET_ACTION_VISIBILITY: TicketActionVisibility = {
  view: true,
  chat: true,
  timeline: true,
  approvals: true,
  inspection: true,
  nextStep: true,
  technicianWorksheet: true,
}

// User style preferences
export interface StylePreferences {
  defaultStyle: TicketStyle
  card: CardStyleConfig
  table: TableStyleConfig
  progress: ProgressStyleConfig
  board: BoardStyleConfig
  ticketActionVisibility: TicketActionVisibility
}

// Complete user preferences for tickets page
export interface UserTicketPreferences {
  stylePreferences: StylePreferences
  filterPresets: FilterPreset[]
  lastUsedFilters: TicketFilters
}

// Default style configurations
export const DEFAULT_CARD_FIELDS = [
  'ticketNumber',
  'date',
  'type',
  'name',
  'vehicle',
  'total',
  'gpPercent',
  'vehicleStatus',
  'salesrep',
  'technician',
  'actions',
]
export const DEFAULT_TABLE_COLUMNS = [
  'ticketNumber',
  'type',
  'date',
  'total',
  'name',
  'vehicle',
  'salesrep',
  'technician',
  'vehicleStatus',
  'statusFlags',
  'actions',
]
export const DEFAULT_PROGRESS_FIELDS = [...DEFAULT_TABLE_COLUMNS]

export const DEFAULT_STYLE_PREFERENCES: StylePreferences = {
  defaultStyle: 'card',
  card: {
    visibleFields: [...DEFAULT_CARD_FIELDS],
    fieldOrder: [...DEFAULT_CARD_FIELDS],
    defaultSort: { field: 'ticketNumber', direction: 'desc' }
  },
  table: {
    visibleColumns: [...DEFAULT_TABLE_COLUMNS],
    columnOrder: [...DEFAULT_TABLE_COLUMNS],
    defaultSort: { column: 'ticketNumber', direction: 'desc' }
  },
  progress: {
    visibleFields: [...DEFAULT_PROGRESS_FIELDS],
    sortBy: 'readyFirst'
  },
  board: {
    tabulateBy: 'vehicleStatus',
    contentFormat: 'table',
    visibleFields: ['ticketNumber', 'name', 'vehicle', 'technician', 'vehicleStatus']
  },
  ticketActionVisibility: { ...DEFAULT_TICKET_ACTION_VISIBILITY },
}

export interface TicketFilters {
  dateRange: string
  customFromDate?: string // MM/DD/YYYY format
  customToDate?: string // MM/DD/YYYY format
  workorder: boolean
  invoice: boolean
  batch: boolean
  quote: boolean
  ticketNumber?: string
  status?: string
  search?: string
  salesrep?: string
  technician?: string
  /** When set, group tickets by this dimension in tabs (None = undefined). Dropdown is the only control. */
  tabulateBy?: TabulationDimension
  // Advanced filter parameters
  storeNum?: number
  routeNum?: string
  partialFill?: number
  backOrder?: number
  natAcct?: number
  printStatus?: number
  // Client-side, calculated-field filters
  onlyOverdue?: boolean
  readyForAtLeastMinutes?: number
  timeInServiceAtLeastMinutes?: number
  timeSinceCheckInAtLeastMinutes?: number
  serviceCycleTimeAtLeastMinutes?: number
  inspectionCompletionAtLeastMinutes?: number
  /** Gross profit percentage range (0–100 scale). */
  gpPercentMin?: number
  gpPercentMax?: number
}

// Default filter values
export const DEFAULT_FILTERS: TicketFilters = {
  dateRange: 'Today',
  workorder: true,
  invoice: false,
  batch: false,
  quote: false,
  tabulateBy: undefined,
}

// Inner payload structure (the JSON string inside the wrapper)
export interface TicketApiPayload {
  searchMode: string
  searchValue: string
  types: string
  partialFill: number
  backOrder: number
  natAcct: number
  fromDate: string
  toDate: string
  inclCarryOver: string // "true" or "false" as string
  storeNum: number
  salesRep: string
  routeNum: string
  vehStatus: number
  printStatus: number
  exactMatch: string // "true" or "false" as string
  maxResults: number
  skipDetail: string // "true" or "false" as string
}

// Wrapper request structure
export interface TicketApiRequest {
  integratorId: string
  account: string
  timestamp: string
  signature: string
  funcName: string
  payload: string // JSON string of TicketApiPayload
}

// API Response Invoice structure
export interface Invoice {
  InvoiceNum: number
  InvoiceVersion: number
  StoreNum: number
  StoreName: string
  VehicleBarCode: string
  Delivery: string
  Salesrep: string
  SalesrepName: string
  Route: string
  RouteName: string
  CustomerTaxCode: string
  CustomerSalesRep: string
  CustomerSalesRepName: string
  Taxable: "Y" | "N"
  SalesTax: string
  SoldPastDue: string
  CustomerType: string
  CustNoFET: "Y" | "N"
  CustNoFETTax: "Y" | "N"
  COD: string
  Name: string
  Address: string
  City: string
  State: string
  Zip: string
  PO: string
  AutoTag: string
  AutoTagState: string
  AutoMake: string
  AutoModel: string
  AutoYear: string
  VIN: string
  Mileage: number
  Cost: string
  Subtotal: string
  Amount: string
  Adjustment: string
  DateSold: string
  CustomerNum: number
  ApptActive: string
  ApptDateTime: string
  ApptDuration: string
  ApptCode: string
  ApptText: string
  BayCode: string
  BayText: string
  OpenStatus: string
  TicketType: string
  ApptVehicleStatus: string | number
  ServiceReminder: string
  Phone: string
  Email: string
  LastEditedBy: string
  LastEditedDateTime: string
  TechnicianCode: string
  TechnicianName: string
  TicketMemo: string
  PendingNotifications: string
  BillToNum: string
  BillToName: string
  ApptID: number
  Items: any[]
  Payments: any[]
}

// API Response structure
export interface TicketApiResponse {
  errorCode: number
  errorText: string
  payload: {
    Account: string
    TimeStamp: string
    Signature: string
    FullDate: string
    ServerNum: number
    Invoices: {
      Insert: Invoice[]
      Delete: any[]
    }
    Receipts: {
      Insert: any[]
      Delete: any[]
    }
    ROAs: {
      Insert: any[]
      Delete: any[]
    }
    EndOfDays: {
      Insert: any[]
      Delete: any[]
    }
  }
}

// Helper functions for status mapping
export function mapVehicleStatusToApi(status: VehicleStatus): number {
  switch (status) {
    case "Online Appointment":
      return 65
    case "Not Here Yet":
      return 0
    case "Check In":
      return 66
    case "On Lot":
      return 2
    case "In Shop":
      return 4
    case "Inspection Complete":
      return 67
    case "Awaiting Callback":
      return 64
    case "Awaiting Parts":
      return 16
    case "Out For Sublet":
      return 32
    case "Ready":
      return 8
    case "Not Started":
    case "":
      return -1 // All statuses
    default:
      return -1
  }
}

export function mapApiStatusToVehicleStatus(apiStatus: string | number): VehicleStatus {
  // Handle numeric status codes from API
  if (typeof apiStatus === 'number') {
    const statusMap: Record<number, VehicleStatus> = {
      65: "Online Appointment",
      0: "Not Here Yet",
      66: "Check In",
      2: "On Lot",
      4: "In Shop",
      67: "Inspection Complete",
      64: "Awaiting Callback",
      16: "Awaiting Parts",
      32: "Out For Sublet",
      8: "Ready",
      [-1]: "", // All statuses
    }
    return statusMap[apiStatus] || ""
  }

  // Handle string status from API
  const statusMap: Record<string, VehicleStatus> = {
    "Not Started": "Not Started",
    "Online Appointment": "Online Appointment",
    "Not Here Yet": "Not Here Yet",
    "Check In": "Check In",
    "On Lot": "On Lot",
    "In Shop": "In Shop",
    "Inspection Complete": "Inspection Complete",
    "Awaiting Callback": "Awaiting Callback",
    "Awaiting Parts": "Awaiting Parts",
    "Out For Sublet": "Out For Sublet",
    "Ready": "Ready",
  }
  return statusMap[apiStatus] || ""
}

// Invoice Detail API Interfaces
export interface InvoiceDetailParams {
  invoiceNum: number
  includeRawData?: boolean | string
  includeSchema?: boolean | string
}

export interface InvoiceDetailResponse {
  success: boolean
  errorCode?: number
  errorText?: string
  invoiceRow?: InvoiceRow
  detailRows?: DetailRow[]
  /** Raw API invoice for building Ticket via buildTicketFromInvoiceDetail */
  invoice?: Invoice
  errors?: string[]
  warnings?: string[]
  error?: string
}

export interface InvoiceRow {
  InvoiceNum: number
  Merchandise?: string
  FET?: string
  Services?: string
  Subtotal?: string
  Cost?: string
  SalesTax?: string
  Total?: string
  Units?: string
  Weight?: string
  CubicSize?: string
  TrailerFeet?: string
  kitTotal?: string
  // Vehicle information (from raw data)
  AutoTag?: string
  AutoTagState?: string
  AutoMake?: string
  AutoModel?: string
  AutoYear?: string
  VIN?: string
  Mileage?: number
}

export interface DetailRow {
  InvoiceNum: number
  LineNum: number
  ProductNum?: string
  Description?: string
  Quantity?: string
  AllowedTime?: string
  PriceCode?: string
  RegularPrice?: string
  UnitPrice?: string
  UnitFet?: string
  Total?: string
  UT1?: string
  Package?: number // Package ID for grouping items
  Rawsize?: string // Raw size field for special handling (e.g., "OIL FILTER", "OIL")
  Goods?: string // "S" (Service) or "G" (Goods) - if "S", hide Quantity on customer view
  Props?: {
    IsDeclined?: boolean
    IsComment?: boolean
    IsKit?: boolean
    IsKitTotaler?: boolean
    IsHeaderItem?: boolean
  }
}
