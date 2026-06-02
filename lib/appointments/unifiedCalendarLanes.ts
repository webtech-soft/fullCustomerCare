import type { AppointmentRecord } from '@/types/appointment'
import { toMinutes } from '@/lib/appointments/time'
import { computeLaneLayout, type LaneAssignment, type LayoutInterval } from '@/lib/appointments/overlapLayout'

function recordToInterval(record: AppointmentRecord): LayoutInterval {
  const start = toMinutes(record.requestedTime)
  const end = start + Math.max(0, record.requestedDuration)
  return { id: record.id, start, end }
}

/** Week/day column: appointments + calendar schedule notes (excludes bay_blocker rows). */
export function computeDayColumnLaneMap(records: AppointmentRecord[], date: string): Map<string, LaneAssignment> {
  const intervals: LayoutInterval[] = []
  for (const r of records) {
    if (r.requestedDate !== date) continue
    if (r.recordType === 'confirmed' || r.recordType === 'booked_unconfirmed') {
      intervals.push(recordToInterval(r))
      continue
    }
    if (r.recordType === 'schedule_note' && r.scheduleBlockerType !== 'bay_blocker') {
      intervals.push(recordToInterval(r))
    }
  }
  return computeLaneLayout(intervals)
}

/** Bay column: appointments + schedule notes except shop_close (matches BayViewGrid note filter). */
export function computeBayColumnLaneMap(
  records: AppointmentRecord[],
  date: string,
  bayId: string
): Map<string, LaneAssignment> {
  const intervals: LayoutInterval[] = []
  for (const r of records) {
    if (r.requestedDate !== date) continue
    if ((r.bayId || 'NB') !== bayId) continue
    if (r.recordType === 'confirmed' || r.recordType === 'booked_unconfirmed') {
      intervals.push(recordToInterval(r))
      continue
    }
    if (r.recordType === 'schedule_note' && r.scheduleBlockerType !== 'shop_close') {
      intervals.push(recordToInterval(r))
    }
  }
  return computeLaneLayout(intervals)
}

export function defaultLaneAssignment(): LaneAssignment {
  return { laneIndex: 0, laneCount: 1 }
}
