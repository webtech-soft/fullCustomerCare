/**
 * Inspection view tracker — customer inspection sent/viewed/active window (mirrors invoice-view-tracker).
 */
import {
  clearInspectionViewStatus,
  getInspectionSentEventsCached,
  getInspectionViewStatusCached,
  listInspectionSentTicketNumbers,
  listInspectionViewedTicketNumbers,
  setInspectionSentEvents,
  setInspectionViewStatus,
} from '@/lib/timelineIndexedDb'

export interface InspectionViewStatus {
  isViewed: boolean
  firstViewed: number
  lastActive: number
  token?: string
}

export interface InspectionSentEvent {
  timestamp: number
  sentBy?: string
  inspectionId?: string
}

const ACTIVE_VIEW_MS = 5 * 60 * 1000

export function getInspectionViewStatus(ticketNumber: number): InspectionViewStatus | null {
  if (typeof window === 'undefined') {
    return null
  }
  return getInspectionViewStatusCached(ticketNumber)
}

export function getAllInspectionSentEvents(ticketNumber: number): InspectionSentEvent[] {
  if (typeof window === 'undefined') {
    return []
  }
  return getInspectionSentEventsCached(ticketNumber)
}

function dispatchInspectionViewChanged(ticketNumber: number): void {
  window.dispatchEvent(
    new CustomEvent('inspection-view-status-changed', {
      detail: { ticketNumber },
    })
  )
}

export function resetInspectionViewStatus(ticketNumber: number): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    void clearInspectionViewStatus(ticketNumber)
    dispatchInspectionViewChanged(ticketNumber)
  } catch (e) {
    console.error('Error resetting inspection view status:', e)
  }
}

/**
 * Append a sent event and clear viewed state (same as invoice resend).
 */
export function markInspectionSent(
  ticketNumber: number,
  sentBy?: string,
  meta?: { inspectionId?: string }
): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    const existing = getAllInspectionSentEvents(ticketNumber)
    const event: InspectionSentEvent = {
      timestamp: Date.now(),
      ...(sentBy && { sentBy }),
      ...(meta?.inspectionId && { inspectionId: meta.inspectionId }),
    }
    existing.push(event)
    void setInspectionSentEvents(ticketNumber, existing)
    resetInspectionViewStatus(ticketNumber)
    window.dispatchEvent(
      new CustomEvent('inspection-sent-changed', {
        detail: { ticketNumber },
      })
    )
  } catch (e) {
    console.error('Error marking inspection sent:', e)
  }
}

export function markInspectionViewAccessed(ticketNumber: number, token: string): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    const now = Date.now()
    const status: InspectionViewStatus = {
      isViewed: true,
      firstViewed: now,
      lastActive: now,
      token,
    }
    void setInspectionViewStatus(ticketNumber, status)
    dispatchInspectionViewChanged(ticketNumber)
  } catch (e) {
    console.error('Error marking inspection view accessed:', e)
  }
}

export function touchInspectionViewActive(ticketNumber: number): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    const status = getInspectionViewStatus(ticketNumber)
    if (!status?.isViewed) return
    const now = Date.now()
    const updated: InspectionViewStatus = {
      ...status,
      lastActive: now,
    }
    void setInspectionViewStatus(ticketNumber, updated)
    dispatchInspectionViewChanged(ticketNumber)
  } catch (e) {
    console.error('Error touching inspection view active:', e)
  }
}

export function isInspectionActivelyViewed(ticketNumber: number): boolean {
  const status = getInspectionViewStatus(ticketNumber)
  if (!status?.isViewed) return false
  return Date.now() - status.lastActive <= ACTIVE_VIEW_MS
}

export function hasInspectionBeenViewed(ticketNumber: number): boolean {
  const s = getInspectionViewStatus(ticketNumber)
  return s !== null && s.isViewed === true
}

export function getAllInspectionViewStatusTicketNumbers(): number[] {
  return listInspectionViewedTicketNumbers()
}

export function getAllInspectionSentTicketNumbers(): number[] {
  return listInspectionSentTicketNumbers()
}
