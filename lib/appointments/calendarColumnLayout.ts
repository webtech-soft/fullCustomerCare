import type { AppointmentRecord } from '@/types/appointment'
import { toMinutes } from '@/lib/appointments/time'
import { GRID_END_HOUR, GRID_START_HOUR, SLOT_HEIGHT_PX } from '@/lib/appointments/shopCalendar'

const SLOT_INSET_PX = 4

export const calendarSlotCount = () => GRID_END_HOUR - GRID_START_HOUR + 1

export const dayColumnHeightPx = () => calendarSlotCount() * SLOT_HEIGHT_PX

/** Minutes from grid top (GRID_START_HOUR:00) to record start; may be fractional via seconds—time string is minute precision. */
export function minutesFromGridTop(record: AppointmentRecord): number {
  return toMinutes(record.requestedTime) - GRID_START_HOUR * 60
}

export function recordIntersectsVisibleGrid(record: AppointmentRecord, date: string): boolean {
  if (record.requestedDate !== date) return false
  const start = toMinutes(record.requestedTime)
  const end = start + Math.max(0, record.requestedDuration)
  const gridStart = GRID_START_HOUR * 60
  const gridEndExclusive = (GRID_END_HOUR + 1) * 60
  return start < gridEndExclusive && end > gridStart
}

/** Bay column: shop_close spans all bays; other records match bayId. */
export function recordInBayColumn(record: AppointmentRecord, date: string, bayId: string): boolean {
  if (record.requestedDate !== date) return false
  if (record.recordType === 'schedule_note' && record.scheduleBlockerType === 'shop_close') {
    return recordIntersectsVisibleGrid(record, date)
  }
  if ((record.bayId || 'NB') !== bayId) return false
  return recordIntersectsVisibleGrid(record, date)
}

export type ColumnBlockStyle = Record<string, string | number>

export function blockTopHeightPx(record: AppointmentRecord): { top: number; height: number } {
  const relStart = minutesFromGridTop(record)
  const top = SLOT_INSET_PX + Math.round((relStart / 60) * SLOT_HEIGHT_PX)
  const height = Math.max(
    22,
    Math.round((record.requestedDuration / 60) * SLOT_HEIGHT_PX) - SLOT_INSET_PX
  )
  return { top, height }
}

export function shopClosureColumnStyle(record: AppointmentRecord, zIndex: number): ColumnBlockStyle {
  const { top, height } = blockTopHeightPx(record)
  return {
    top: `${top}px`,
    height: `${height}px`,
    left: '0.25rem',
    right: '0.25rem',
    width: 'auto',
    zIndex,
  }
}

export function absoluteBlockStyle(
  record: AppointmentRecord,
  laneIndex: number,
  laneCount: number,
  zIndex: number,
  blockerOffsetPx: number
): ColumnBlockStyle {
  const { top, height } = blockTopHeightPx(record)
  const laneWidthPct = 100 / laneCount
  return {
    top: `${top}px`,
    height: `${height}px`,
    left: `calc(${laneIndex * laneWidthPct}% + ${SLOT_INSET_PX + blockerOffsetPx}px)`,
    width: `calc(${laneWidthPct}% - ${SLOT_INSET_PX * 2 + blockerOffsetPx}px)`,
    right: 'auto',
    zIndex,
  }
}

export function bayBlockerColumnStyle(record: AppointmentRecord, zIndex: number): ColumnBlockStyle {
  const { top, height } = blockTopHeightPx(record)
  return {
    top: `${top}px`,
    height: `${height}px`,
    left: `${SLOT_INSET_PX}px`,
    width: '20px',
    zIndex,
  }
}

/** Y position of “now” line from top of day column (px). */
export function nowLineTopFromGridStart(nowMinutesOfDay: number): number | null {
  if (nowMinutesOfDay < GRID_START_HOUR * 60 || nowMinutesOfDay >= (GRID_END_HOUR + 1) * 60) {
    return null
  }
  const rel = nowMinutesOfDay - GRID_START_HOUR * 60
  return Math.min(
    dayColumnHeightPx() - 1,
    SLOT_INSET_PX + Math.round((rel / 60) * SLOT_HEIGHT_PX)
  )
}
