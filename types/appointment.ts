export interface AppointmentType {
  id: string
  name: string
  duration: number // in minutes
  icon: string // icon name from lucide-vue-next
  description?: string
}

export interface AppointmentIssueOption {
  id: string
  label: string
}

export interface AppointmentIssueQuestion {
  id: string
  prompt: string
  options: AppointmentIssueOption[]
}

export interface AppointmentServiceQuestionTree {
  serviceId: string
  issueQuestion: AppointmentIssueQuestion
  followupQuestions: AppointmentIssueQuestion[]
}

export type AppointmentIssueAnswers = Record<string, string>

export type AppointmentRecordType =
  | 'quick_note'
  | 'schedule_note'
  | 'booked_unconfirmed'
  | 'confirmed'

export type AppointmentBlockColorKey =
  | 'blue'
  | 'indigo'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'slate'

export type AppointmentColorScopeType = AppointmentRecordType

export type ScheduleNoteBlockerType = 'bay_blocker' | 'shop_close' | 'technician_unavailable'

export type AppointmentStatus =
  | 'confirmed'
  | 'unconfirmed'

export type AppointmentSortBy =
  | 'date_time_asc'
  | 'date_time_desc'
  | 'customer_asc'
  | 'customer_desc'
  | 'status_confirmed_first'
  | 'status_unconfirmed_first'

export interface BayConfig {
  bayId: string
  bayName: string
  techName: string
  bayType: 'general' | 'tires' | 'oil' | 'alignment' | 'other'
  sortOrder: number
  isActive: boolean
}

export interface AppointmentVehicle {
  year?: string
  make?: string
  model?: string
  vin?: string
  licensePlate?: string
  tagState?: string
}

export interface AppointmentRecord {
  id: string
  accountId: string
  storeId: string
  customerId?: string | null
  customerName: string
  customerPhone?: string
  customerEmail?: string
  sendText: boolean
  sendEmail: boolean
  recordType: AppointmentRecordType
  scheduleBlockerType?: ScheduleNoteBlockerType
  status: AppointmentStatus
  requestedDate: string // YYYY-MM-DD
  requestedTime: string // HH:mm
  requestedDuration: number // minutes
  bayId?: string | null
  bayName?: string | null
  note?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  confirmedAt?: string
  confirmedBy?: string
  posFlag: boolean
  apiSubmitted: boolean
  integratorId?: string | null
  promisedAt?: string
  completedAt?: string
  vehicle?: AppointmentVehicle
  colorOverride?: AppointmentBlockColorKey
}

export interface AppointmentFilters {
  search: string
  bayIds: string[]
  recordTypes: AppointmentRecordType[]
  statuses: AppointmentStatus[]
  sortBy: AppointmentSortBy
  dateFrom?: string
  dateTo?: string
}

export interface AppointmentListResult {
  records: AppointmentRecord[]
}

export interface ICalSyncInfo {
  status: 'not_synced' | 'synced' | 'error'
  lastSyncedAt?: string
}
