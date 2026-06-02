/**
 * Invoice View Tracker - Tracks customer invoice views and related events
 */
import {
  clearInvoiceViewStatus,
  getInvoiceViewStatusCached,
  getTicketSentEventsCached,
  getVehicleStatusChangesCached,
  listInvoiceViewedTicketNumbers,
  setInvoiceViewStatus,
  setTicketSentEvents,
  setVehicleStatusChanges,
} from '@/lib/timelineIndexedDb'

export interface InvoiceViewStatus {
  isViewed: boolean
  firstViewed: number
  lastActive: number
  token?: string
}

export interface VehicleStatusChange {
  status: string
  timestamp: number
}

export interface TrackVehicleStatusOptions {
  user?: string
  ticketTotal?: number
  /** When set (e.g. list-refresh or server push time), stored as the event timestamp instead of Date.now(). */
  at?: number
}

/** Minimal ticket shape for syncing vehicle status from API / list fetch into the timeline. */
export interface TicketVehicleStatusSource {
  ticketNumber: number
  vehicleStatus?: string | null
}

/**
 * After fetching tickets from the server, append a vehicle-status timeline row only when the API
 * status differs from the last stored change (see trackVehicleStatusChange).
 * Timestamp defaults to `receivedAt` or Date.now() — "first moment we observed this status in this payload."
 *
 * When a real-time API delivers status updates, call trackVehicleStatusChange with `at` from the message.
 * @returns entries that were newly appended (for optional backend persist)
 */
export function syncVehicleStatusTimelineFromTickets(
  tickets: TicketVehicleStatusSource[],
  options?: { receivedAt?: number }
): Array<{ ticketNumber: number; status: string }> {
  if (typeof window === 'undefined') {
    return []
  }
  const receivedAt = options?.receivedAt ?? Date.now()
  const appended: Array<{ ticketNumber: number; status: string }> = []
  for (const t of tickets) {
    if (t.ticketNumber == null) continue
    const status = String(t.vehicleStatus ?? '').trim()
    if (!status) continue
    const did = trackVehicleStatusChange(t.ticketNumber, status, { at: receivedAt })
    if (did) {
      appended.push({ ticketNumber: t.ticketNumber, status })
    }
  }
  return appended
}

/**
 * Track a vehicle status change for a ticket
 * Stores the change in timeline IndexedDB for timeline display.
 * Optional options (user, ticketTotal, at) are for building the flat timeline row when persisting to API
 * or aligning timestamps with server/list-refresh time.
 * @returns true if a new event was appended
 */
export function trackVehicleStatusChange(
  ticketNumber: number,
  newStatusRaw: string,
  options?: TrackVehicleStatusOptions
): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const newStatus = String(newStatusRaw ?? '').trim()
  if (!newStatus) {
    return false
  }

  try {
    const timestamp = options?.at ?? Date.now()

    const changes: VehicleStatusChange[] = getVehicleStatusChangesCached(ticketNumber)

    // Do not add a new event if the status is the same as the last logged event
    const lastChange = changes[changes.length - 1]
    if (lastChange && lastChange.status === newStatus) {
      return false
    }

    changes.push({
      status: newStatus,
      timestamp,
    })

    void setVehicleStatusChanges(ticketNumber, changes)

    // Dispatch custom event for same-tab updates (newStatus aligns with TicketsPage / invoice listeners)
    window.dispatchEvent(
      new CustomEvent('vehicle-status-changed', {
        detail: { ticketNumber, newStatus, status: newStatus },
      })
    )
    return true
  } catch (error) {
    console.error('Error tracking vehicle status change:', error)
    return false
  }
}

/**
 * Get all vehicle status changes for a ticket
 */
export function getVehicleStatusChanges(ticketNumber: number): VehicleStatusChange[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const changes = getVehicleStatusChangesCached(ticketNumber)
    return changes
      .filter((change): change is VehicleStatusChange => {
        return (
          typeof change === 'object' &&
          change !== null &&
          typeof change.status === 'string' &&
          typeof change.timestamp === 'number'
        )
      })
      .sort((a, b) => a.timestamp - b.timestamp) // Sort by timestamp (oldest first)
  } catch (error) {
    console.error('Error getting vehicle status changes:', error)
    return []
  }
}

/**
 * Get invoice view status for a ticket
 */
export function getInvoiceViewStatus(ticketNumber: number): InvoiceViewStatus | null {
  if (typeof window === 'undefined') {
    return null
  }

  return getInvoiceViewStatusCached(ticketNumber)
}

export interface MarkInvoiceViewAccessedOptions {
  ticketTotal?: number
}

/**
 * Mark invoice as viewed/accessed
 * Optional ticketTotal is for building the flat timeline row when persisting to API.
 */
export function markInvoiceViewAccessed(
  ticketNumber: number,
  token: string,
  _options?: MarkInvoiceViewAccessedOptions
): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const now = Date.now()

    const status: InvoiceViewStatus = {
      isViewed: true,
      firstViewed: now,
      lastActive: now,
      token,
    }

    void setInvoiceViewStatus(ticketNumber, status)

    // Also dispatch custom event for same-tab updates
    window.dispatchEvent(
      new CustomEvent('invoice-view-status-changed', {
        detail: { ticketNumber },
      })
    )
  } catch (error) {
    console.error('Error marking invoice as viewed:', error)
  }
}

/**
 * Update lastActive to now for an already-viewed ticket (e.g. customer view is open).
 * Use when the customer view is shown so "actively viewing" / timeline pulse stays on.
 * Does nothing if the ticket has no view status yet (use markInvoiceViewAccessed for first view).
 */
export function touchInvoiceViewActive(ticketNumber: number): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const status = getInvoiceViewStatus(ticketNumber)
    if (!status || !status.isViewed) {
      return
    }

    const now = Date.now()
    const updated: InvoiceViewStatus = {
      ...status,
      lastActive: now,
    }
    void setInvoiceViewStatus(ticketNumber, updated)
    window.dispatchEvent(
      new CustomEvent('invoice-view-status-changed', {
        detail: { ticketNumber },
      })
    )
  } catch (error) {
    console.error('Error touching invoice view active:', error)
  }
}

/**
 * Get all ticket sent events for a ticket
 */
export function getAllTicketSentEvents(
  ticketNumber: number
): Array<{ timestamp: number; sentBy?: string }> {
  if (typeof window === 'undefined') {
    return []
  }

  return getTicketSentEventsCached(ticketNumber)
}

/**
 * Check if an invoice has been viewed at all
 */
export function hasInvoiceBeenViewed(ticketNumber: number): boolean {
  const status = getInvoiceViewStatus(ticketNumber)
  return status !== null && status.isViewed === true
}

/**
 * Check if an invoice is currently being actively viewed
 * An invoice is considered "actively viewed" if it was viewed within the last 5 minutes
 */
export function isInvoiceActivelyViewed(ticketNumber: number): boolean {
  const status = getInvoiceViewStatus(ticketNumber)
  if (!status || !status.isViewed) {
    return false
  }

  // After a customer opens the invoice view, keep the button "active" (pulsing) for 5 minutes,
  // then let it become solid red without polling for inactivity.
  const VIEW_BUTTON_SOLID_AFTER_MS = 5 * 60 * 1000
  const now = Date.now()
  const timeSinceLastActive = now - status.lastActive

  return timeSinceLastActive <= VIEW_BUTTON_SOLID_AFTER_MS
}

/**
 * Reset/clear the invoice view status for a ticket
 */
export function resetInvoiceViewStatus(ticketNumber: number): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    void clearInvoiceViewStatus(ticketNumber)

    // Also dispatch custom event for same-tab updates
    window.dispatchEvent(
      new CustomEvent('invoice-view-status-changed', {
        detail: { ticketNumber },
      })
    )
  } catch (error) {
    console.error('Error resetting invoice view status:', error)
  }
}

export interface MarkTicketSentOptions {
  ticketTotal?: number
}

/**
 * Mark that a ticket was sent to the customer
 * Optional ticketTotal is for building the flat timeline row when persisting to API.
 */
export function markTicketSent(
  ticketNumber: number,
  sentBy?: string,
  _options?: MarkTicketSentOptions
): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const timestamp = Date.now()

    // Get existing sent events
    const existingEvents = getAllTicketSentEvents(ticketNumber)
    
    // Add new sent event
    const newEvent: { timestamp: number; sentBy?: string } = {
      timestamp,
      ...(sentBy && { sentBy }),
    }
    
    existingEvents.push(newEvent)

    void setTicketSentEvents(ticketNumber, existingEvents)
  } catch (error) {
    console.error('Error marking ticket as sent:', error)
  }
}

export function getAllInvoiceViewStatusTicketNumbers(): number[] {
  return listInvoiceViewedTicketNumbers()
}
