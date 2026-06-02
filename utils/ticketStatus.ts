import type { Ticket, TicketStatusMeta, VehicleStatus } from '@/types/ticket'
import { getInvoiceViewStatus } from '@/lib/invoice-view-tracker'
import {
  getAllInspectionSentEvents,
  getInspectionViewStatus,
} from '@/lib/inspection-view-tracker'
import { getWorkApproval } from '@/lib/work-approvals'

export interface DerivedStatusFlags {
  isViewed: boolean
  isApproved: boolean
  isOverdue: boolean
  inspectionViewed: boolean
  inspectionSent: boolean
  inspectionStarted: boolean
  inspectionComplete: boolean
}

export const INSPECTION_STATUS_TAB_ORDER = [
  'Inspection Not Started',
  'Inspection Started',
  'Inspection Complete',
  'Inspection Sent',
  'Inspection Viewed',
] as const

export type InspectionStatusTabBucket = (typeof INSPECTION_STATUS_TAB_ORDER)[number]

function computeOverdue(ticket: Ticket, now: Date): boolean {
  if (!ticket.promisedTime) return false

  const start = new Date(ticket.promisedTime)
  if (Number.isNaN(start.getTime())) return false

  const durationMinutes = ticket.apptDurationMinutes ?? 0
  const endTime = new Date(start.getTime() + durationMinutes * 60_000)
  if (Number.isNaN(endTime.getTime())) return false

  const terminalStatuses: VehicleStatus[] = ['Ready', 'Inspection Complete']
  const status = ticket.vehicleStatus ?? ''
  const isTerminal = terminalStatuses.includes(status as VehicleStatus)

  if (isTerminal) return false

  return now.getTime() > endTime.getTime()
}

function computeInspectionFlags(ticket: Ticket) {
  const status = ticket.inspectionStatus
  const hasInspection = !!ticket.inspectionId

  const inspectionComplete = status === 'complete'
  const inspectionStarted =
    !inspectionComplete && (status === 'incomplete' || (hasInspection && status !== 'none'))

  return {
    inspectionStarted,
    inspectionComplete,
  }
}

export function getTicketStatusFlags(
  ticket: Ticket,
  meta?: TicketStatusMeta,
  now: Date = new Date()
): DerivedStatusFlags {
  const { inspectionStarted, inspectionComplete } = computeInspectionFlags(ticket)
  const isOverdue = computeOverdue(ticket, now)

  let isViewed = false
  let isApproved = false
  let inspectionViewed = false
  let inspectionSent = false

  const viewStatus = getInvoiceViewStatus(ticket.ticketNumber)
  if (viewStatus?.isViewed) {
    isViewed = true
  }

  const approval = getWorkApproval(ticket.ticketNumber)
  if ((approval?.items?.length ?? 0) > 0) {
    isApproved = true
  }

  if (typeof meta?.isViewed === 'boolean') {
    isViewed = meta.isViewed
  }

  if (typeof meta?.isApproved === 'boolean') {
    isApproved = meta.isApproved
  }

  if (typeof meta?.inspectionViewed === 'boolean') {
    inspectionViewed = meta.inspectionViewed
  }

  const inspectionSentEvents = getAllInspectionSentEvents(ticket.ticketNumber)
  const hasInspectionSentInStorage = inspectionSentEvents.length > 0
  const inspectionViewInStorage = getInspectionViewStatus(ticket.ticketNumber)
  if (typeof meta?.inspectionSent !== 'boolean' && hasInspectionSentInStorage) {
    inspectionSent = true
  }
  if (typeof meta?.inspectionViewed !== 'boolean' && inspectionViewInStorage?.isViewed) {
    inspectionViewed = true
  }

  if (typeof meta?.inspectionSent === 'boolean') {
    inspectionSent = meta.inspectionSent
  }

  const effectiveInspectionStarted =
    typeof meta?.inspectionStarted === 'boolean' ? meta.inspectionStarted : inspectionStarted

  const effectiveInspectionComplete =
    typeof meta?.inspectionComplete === 'boolean' ? meta.inspectionComplete : inspectionComplete

  return {
    isViewed,
    isApproved,
    isOverdue,
    inspectionViewed,
    inspectionSent,
    inspectionStarted: !!effectiveInspectionStarted,
    inspectionComplete: !!effectiveInspectionComplete,
  }
}

export function getInspectionStatusTabBucket(
  ticket: Ticket,
  meta?: TicketStatusMeta
): InspectionStatusTabBucket {
  const flags = getTicketStatusFlags(ticket, meta)
  if (flags.inspectionViewed) return 'Inspection Viewed'
  if (flags.inspectionComplete && flags.inspectionSent && !flags.inspectionViewed) {
    return 'Inspection Sent'
  }
  if (flags.inspectionComplete) return 'Inspection Complete'
  if (flags.inspectionStarted) return 'Inspection Started'
  return 'Inspection Not Started'
}

