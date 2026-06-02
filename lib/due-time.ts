import type { Ticket } from '@/types/ticket'

/** End of business day hour (18 = 6 PM) when no ApptDuration is set */
const EOD_HOUR = 18
const EOD_MINUTE = 0

function parseApptDateTime(raw?: string): Date | null {
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return d
}

/**
 * Returns the due time for a ticket.
 * - With apptDurationMinutes: start (promisedTime = ApptDateTime) + duration minutes.
 * - Without ApptDuration: end of business day (6 PM) of the ticket date (DateSold).
 *   When there is ApptDateTime but no ApptDuration, we ignore the date from ApptDateTime
 *   and use DateSold (ticket.date) as the actual date for EOD.
 */
export function getDueTime(ticket: Ticket): Date | null {
  const duration = ticket.apptDurationMinutes

  if (duration != null && Number.isFinite(duration) && duration > 0) {
    const start = parseApptDateTime(ticket.promisedTime)
    if (!start) return null
    const due = new Date(start.getTime() + duration * 60 * 1000)
    return due
  }

  // No ApptDuration: use ticket date (DateSold) for EOD, not ApptDateTime
  if (!ticket.date) return null
  const dateOnly = new Date(ticket.date)
  if (Number.isNaN(dateOnly.getTime())) return null
  dateOnly.setHours(EOD_HOUR, EOD_MINUTE, 0, 0)
  return dateOnly
}

/**
 * Remaining minutes until due (positive) or overdue (negative).
 * Returns null if ticket has no promisedTime.
 */
export function getRemainingMinutes(ticket: Ticket): number | null {
  const due = getDueTime(ticket)
  if (!due) return null
  const now = new Date()
  const diffMs = due.getTime() - now.getTime()
  return Math.round(diffMs / (60 * 1000))
}

/**
 * True when due time has passed.
 */
export function isOverdue(ticket: Ticket): boolean {
  const remaining = getRemainingMinutes(ticket)
  if (remaining === null) return false
  return remaining < 0
}

/**
 * True when 20% or less of the original window remains (and not yet overdue).
 * For tickets with apptDurationMinutes, "window" = duration; otherwise we don't apply due-soon.
 */
export function isDueSoon(ticket: Ticket): boolean {
  const duration = ticket.apptDurationMinutes
  if (duration == null || !Number.isFinite(duration) || duration <= 0) return false
  const remaining = getRemainingMinutes(ticket)
  if (remaining === null || remaining < 0) return false
  const thresholdMinutes = duration * 0.2
  return remaining <= thresholdMinutes
}
