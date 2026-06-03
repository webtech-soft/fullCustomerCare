/**
 * Timeline API - persist timeline events to the backend.
 *
 * Spec: insert timeline row endpoint
 * - Method: POST
 * - Body: TimelineEventInsert (flat row matching 13-column schema)
 * - IPaddress for Type 2 (Sent) and Type 3 (Viewed) is set server-side from the request.
 * - TicketTotal, User, etc. are sent from the client when available.
 *
 * Set VITE_TIMELINE_INSERT_URL to the insert endpoint URL when the backend is ready.
 * Until then, persistTimelineEvent is a no-op.
 */
import type { TimelineEventInsert } from '@/types/timeline'
import { saveTimelineEventLocal, toTimelineIdbRow } from '@/lib/timelineIndexedDb'

const TIMELINE_INSERT_URL = import.meta.env.VITE_TIMELINE_INSERT_URL as string | undefined

/**
 * Persist a timeline event (insert row).
 * When VITE_TIMELINE_INSERT_URL is set, POSTs the row to that endpoint.
 * Otherwise no-op (localStorage and UI unchanged; backend will write when it handles send/view/status/approval).
 */
export async function persistTimelineEvent(row: TimelineEventInsert): Promise<void> {
  const normalizedRow = toTimelineIdbRow(row)
  await saveTimelineEventLocal(row)
  if (!TIMELINE_INSERT_URL || typeof fetch === 'undefined') {
    return
  }
  try {
    const res = await fetch(TIMELINE_INSERT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        TicketNum: normalizedRow.ticket_num,
        Type: normalizedRow.type,
        User: normalizedRow.username,
        Datetime: normalizedRow.datetime,
        TicketTotal: normalizedRow.ticket_total,
        VehicleStatus: normalizedRow.vehicle_sts,
        IPaddress: normalizedRow.ip,
        ApprovalName: normalizedRow.approval_name,
        ApprovalTotal: normalizedRow.approval_total,
        ApprovalDetails: normalizedRow.approval_details,
        ApprovalSignature: normalizedRow.approval_signature,
        ApprovalLink: normalizedRow.attr_link,
        attrLink: normalizedRow.attr_link,
        Hide: normalizedRow.hide,
      } satisfies TimelineEventInsert),
    })
    if (!res.ok) {
      console.error('Timeline persist failed:', res.status, await res.text())
    }
  } catch (err) {
    console.error('Timeline persist error:', err)
  }
}
