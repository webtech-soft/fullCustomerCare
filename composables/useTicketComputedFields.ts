import type { Ticket } from '@/types/ticket'
import { getVehicleStatusChanges } from '@/lib/invoice-view-tracker'

export interface TicketComputedFields {
  ticketAgeMinutes: number | null
  ticketAgeLabel: string | null
  timeSinceCheckInMinutes: number | null
  timeSinceCheckInLabel: string | null
  serviceCycleTimeMinutes: number | null
  serviceCycleTimeLabel: string | null
  inspectionCompletionMinutes: number | null
  inspectionCompletionLabel: string | null
  promisedStart: Date | null
  promisedEnd: Date | null
  timeUntilPromiseMinutes: number | null
  timeUntilPromiseLabel: string | null
  timeUntilDueLabel: string | null
  promiseOverdueByMinutes: number | null
  promiseOverdueByLabel: string | null
  overdueTimeLabel: string | null
  readyForMinutes: number | null
  readyForLabel: string | null
}

const MS_PER_MINUTE = 60 * 1000
const MS_PER_HOUR = 60 * MS_PER_MINUTE
const MS_PER_DAY = 24 * MS_PER_HOUR
const NON_SERVICE_START_STATUSES = new Set([
  'Not Started',
  'Online Appointment',
  'Not Here Yet',
  'Check In',
])
const CHECK_IN_STOP_STATUSES = new Set(['On Lot', 'In Shop', 'Inspection Complete', 'Ready'])
const INSPECTION_START_STATUS = 'On Lot'
const INSPECTION_COMPLETE_STATUS = 'Inspection Complete'

function parseDateLike(input: string | undefined | null): Date | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null

  // First, try the built-in parser (handles ISO strings, many common formats)
  const direct = new Date(trimmed)
  if (!Number.isNaN(direct.getTime())) {
    return direct
  }

  // Handle MM/DD/YYYY or MM/DD/YYYY HH:MM(:SS) formats from the API
  const [datePart, timePart] = trimmed.split(' ')
  const datePieces = datePart.split('/')
  if (datePieces.length === 3) {
    const month = parseInt(datePieces[0], 10) - 1
    const day = parseInt(datePieces[1], 10)
    const year = parseInt(datePieces[2], 10)
    if (!Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(year)) {
      return null
    }

    let hours = 0
    let minutes = 0
    if (timePart) {
      const timePieces = timePart.split(':')
      if (timePieces.length >= 2) {
        hours = parseInt(timePieces[0], 10) || 0
        minutes = parseInt(timePieces[1], 10) || 0
      }
    }

    const d = new Date(year, month, day, hours, minutes)
    return Number.isNaN(d.getTime()) ? null : d
  }

  return null
}

/** Format duration in hours and minutes (e.g. "45m", "1h 30m", "2d 1h 15m"). */
function formatDurationShort(minutes: number | null): string | null {
  if (minutes == null || !Number.isFinite(minutes)) return null

  const absMinutes = Math.abs(Math.round(minutes))
  const sign = minutes < 0 ? '-' : ''

  if (absMinutes < 60) {
    return `${sign}${absMinutes}m`
  }

  const totalHours = Math.floor(absMinutes / 60)
  const mins = absMinutes % 60
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  parts.push(`${hours}h`)
  parts.push(`${mins}m`)

  return `${sign}${parts.join(' ')}`
}

function firstStatusTimestamp(
  changes: Array<{ status: string; timestamp: number }>,
  predicate: (status: string) => boolean
): number | null {
  const match = changes.find((change) => predicate(change.status))
  return match ? match.timestamp : null
}

function getFirstSubsequentStatusTimestamp(
  changes: Array<{ status: string; timestamp: number }>,
  afterTimestamp: number,
  predicate: (status: string) => boolean
): number | null {
  for (const change of changes) {
    if (change.timestamp <= afterTimestamp) continue
    if (predicate(change.status)) {
      return change.timestamp
    }
  }
  return null
}

function readNumberFromStorage(key: string): number | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(key)
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function writeNumberToStorage(key: string, value: number): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, String(value))
}

function getInvoiceTransitionTiming(ticket: Ticket, nowTs: number): {
  transitionToInvoiceAt: number | null
  firstInvoiceObservedAt: number | null
  firstWorkorderObservedAt: number | null
} {
  if (typeof window === 'undefined' || typeof ticket.ticketNumber !== 'number') {
    return { transitionToInvoiceAt: null, firstInvoiceObservedAt: null, firstWorkorderObservedAt: null }
  }

  const ticketNumber = ticket.ticketNumber
  const keyLastType = `ticket_last_type_${ticketNumber}`
  const keyTransitionToInvoice = `ticket_type_transition_to_invoice_${ticketNumber}`
  const keyFirstInvoiceObserved = `ticket_first_invoice_observed_${ticketNumber}`
  const keyFirstWorkorderObserved = `ticket_first_workorder_observed_${ticketNumber}`

  const previousType = localStorage.getItem(keyLastType)
  let transitionToInvoiceAt = readNumberFromStorage(keyTransitionToInvoice)
  let firstInvoiceObservedAt = readNumberFromStorage(keyFirstInvoiceObserved)
  let firstWorkorderObservedAt = readNumberFromStorage(keyFirstWorkorderObserved)

  if (ticket.type === 'W' && firstWorkorderObservedAt == null) {
    firstWorkorderObservedAt = nowTs
    writeNumberToStorage(keyFirstWorkorderObserved, nowTs)
  }

  if (ticket.type === 'I' && firstInvoiceObservedAt == null) {
    firstInvoiceObservedAt = nowTs
    writeNumberToStorage(keyFirstInvoiceObserved, nowTs)
  }

  if (previousType && previousType !== 'I' && ticket.type === 'I' && transitionToInvoiceAt == null) {
    transitionToInvoiceAt = nowTs
    writeNumberToStorage(keyTransitionToInvoice, nowTs)
  }

  localStorage.setItem(keyLastType, ticket.type)

  return { transitionToInvoiceAt, firstInvoiceObservedAt, firstWorkorderObservedAt }
}

export function getTicketComputedFields(ticket: Ticket, now: Date = new Date()): TicketComputedFields {
  const nowTs = now.getTime()
  const changes = typeof ticket.ticketNumber === 'number' ? getVehicleStatusChanges(ticket.ticketNumber) : []

  // Time In Service starts at the first status that is not a pre-service/check-in state.
  const timeInServiceStart = firstStatusTimestamp(
    changes,
    (status) => !!status && !NON_SERVICE_START_STATUSES.has(status)
  )
  const ticketAgeMinutes =
    ticket.type === 'I'
      ? null
      : timeInServiceStart != null
        ? Math.round((nowTs - timeInServiceStart) / MS_PER_MINUTE)
        : null

  // Time Since Check In starts at latest Check In and stops at the first service-phase stop status.
  let timeSinceCheckInMinutes: number | null = null
  const latestCheckIn = [...changes].reverse().find((change) => change.status === 'Check In')
  if (latestCheckIn) {
    const stopTs = getFirstSubsequentStatusTimestamp(
      changes,
      latestCheckIn.timestamp,
      (status) => CHECK_IN_STOP_STATUSES.has(status)
    )
    const endTs = stopTs ?? nowTs
    if (endTs >= latestCheckIn.timestamp) {
      timeSinceCheckInMinutes = Math.round((endTs - latestCheckIn.timestamp) / MS_PER_MINUTE)
    }
  }

  // Total Time In Service starts at first observed status and ends at W->I transition.
  // If transition is unknown and ticket is invoice, use first observed invoice timestamp.
  let serviceCycleTimeMinutes: number | null = null
  const firstObservedStatusTs = changes.length > 0 ? changes[0].timestamp : null
  if (firstObservedStatusTs != null) {
    const { transitionToInvoiceAt, firstInvoiceObservedAt, firstWorkorderObservedAt } = getInvoiceTransitionTiming(ticket, nowTs)
    const startTs = firstWorkorderObservedAt ?? firstObservedStatusTs
    const endTs = transitionToInvoiceAt ?? (ticket.type === 'I' ? firstInvoiceObservedAt : null) ?? nowTs
    if (endTs >= startTs) {
      serviceCycleTimeMinutes = Math.round((endTs - startTs) / MS_PER_MINUTE)
    }
  }

  // Time To Complete Inspection starts at On Lot and ends at Inspection Complete.
  let inspectionCompletionMinutes: number | null = null
  const latestOnLot = [...changes].reverse().find((change) => change.status === INSPECTION_START_STATUS)
  if (latestOnLot) {
    const inspectionCompleteTs = getFirstSubsequentStatusTimestamp(
      changes,
      latestOnLot.timestamp,
      (status) => status === INSPECTION_COMPLETE_STATUS
    )
    const endTs = inspectionCompleteTs ?? nowTs
    if (endTs >= latestOnLot.timestamp) {
      inspectionCompletionMinutes = Math.round((endTs - latestOnLot.timestamp) / MS_PER_MINUTE)
    }
  }

  const promisedStart = parseDateLike(ticket.promisedTime)

  const durationMinutes =
    typeof ticket.apptDurationMinutes === 'number' && Number.isFinite(ticket.apptDurationMinutes)
      ? ticket.apptDurationMinutes
      : null

  const promisedEnd =
    promisedStart && durationMinutes != null
      ? new Date(promisedStart.getTime() + durationMinutes * MS_PER_MINUTE)
      : promisedStart

  let timeUntilPromiseMinutes: number | null = null
  if (promisedEnd) {
    timeUntilPromiseMinutes = Math.round((promisedEnd.getTime() - now.getTime()) / MS_PER_MINUTE)
  }

  const promiseOverdueByMinutes =
    timeUntilPromiseMinutes != null && timeUntilPromiseMinutes < 0
      ? Math.abs(timeUntilPromiseMinutes)
      : null
  const promiseOverdueByLabel =
    promiseOverdueByMinutes != null ? formatDurationShort(promiseOverdueByMinutes) : null

  // Time since vehicle status was marked "Ready" (from timeline / vehicle status changes).
  let readyForMinutes: number | null = null
  if (ticket.vehicleStatus === 'Ready' && typeof ticket.ticketNumber === 'number') {
    const lastReady = [...changes].reverse().find((c) => c.status === 'Ready')
    if (lastReady) {
      readyForMinutes = Math.round((nowTs - lastReady.timestamp) / MS_PER_MINUTE)
    }
  }
  const readyForLabel = readyForMinutes != null ? formatDurationShort(readyForMinutes) : null

  return {
    ticketAgeMinutes,
    ticketAgeLabel:
      ticketAgeMinutes != null ? formatDurationShort(ticketAgeMinutes) : null,
    timeSinceCheckInMinutes,
    timeSinceCheckInLabel: formatDurationShort(timeSinceCheckInMinutes),
    serviceCycleTimeMinutes,
    serviceCycleTimeLabel: formatDurationShort(serviceCycleTimeMinutes),
    inspectionCompletionMinutes,
    inspectionCompletionLabel: formatDurationShort(inspectionCompletionMinutes),
    promisedStart,
    promisedEnd,
    timeUntilPromiseMinutes,
    timeUntilPromiseLabel: formatDurationShort(timeUntilPromiseMinutes),
    timeUntilDueLabel: formatDurationShort(timeUntilPromiseMinutes),
    promiseOverdueByMinutes,
    promiseOverdueByLabel,
    overdueTimeLabel: promiseOverdueByLabel,
    readyForMinutes,
    readyForLabel,
  }
}

