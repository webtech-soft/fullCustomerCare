import type { AppointmentRecord } from '@/types/appointment'
import { minutesToTime, toMinutes } from '@/lib/appointments/time'

/** Half-open interval in minutes from midnight: [start, end) */
type MinuteRange = { start: number; end: number }

function mergeRanges(ranges: MinuteRange[]): MinuteRange[] {
  if (ranges.length === 0) return []
  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end)
  const out: MinuteRange[] = []
  let cur = { ...sorted[0] }
  for (let i = 1; i < sorted.length; i += 1) {
    const r = sorted[i]
    if (r.start <= cur.end) {
      cur.end = Math.max(cur.end, r.end)
    } else {
      out.push(cur)
      cur = { ...r }
    }
  }
  out.push(cur)
  return out
}

function rangesEqual(a: MinuteRange, b: MinuteRange): boolean {
  return a.start === b.start && a.end === b.end
}

/** Subtract half-open cut from block; returns 0–2 fragments. */
function subtractOne(block: MinuteRange, cut: MinuteRange): MinuteRange[] {
  const b = block
  const c = cut
  if (c.end <= b.start || c.start >= b.end) {
    return [b]
  }
  const out: MinuteRange[] = []
  if (b.start < c.start) {
    out.push({ start: b.start, end: Math.min(c.start, b.end) })
  }
  if (c.end < b.end) {
    out.push({ start: Math.max(c.end, b.start), end: b.end })
  }
  return out.filter((r) => r.end > r.start)
}

function subtractMany(block: MinuteRange, cuts: MinuteRange[]): MinuteRange[] {
  let parts: MinuteRange[] = [block]
  for (const cut of cuts) {
    parts = parts.flatMap((p) => subtractOne(p, cut)).filter((p) => p.end > p.start)
  }
  return parts
}

function newAppointmentId(): string {
  return `appt-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

/**
 * For one date: trim/remove bay_blocker schedule notes so they do not overlap
 * the union of all shop_close intervals on that date.
 */
export function reconcileBayBlockersForDate(records: AppointmentRecord[], date: string): AppointmentRecord[] {
  const shopRanges: MinuteRange[] = records
    .filter(
      (r) =>
        r.requestedDate === date && r.recordType === 'schedule_note' && r.scheduleBlockerType === 'shop_close'
    )
    .map((r) => {
      const start = toMinutes(r.requestedTime)
      const end = start + r.requestedDuration
      return { start, end }
    })
    .filter((r) => r.end > r.start)

  if (shopRanges.length === 0) {
    return records
  }

  const mergedCuts = mergeRanges(shopRanges)
  const nowIso = new Date().toISOString()
  const out: AppointmentRecord[] = []

  for (const r of records) {
    if (r.requestedDate !== date || r.recordType !== 'schedule_note' || r.scheduleBlockerType !== 'bay_blocker') {
      out.push(r)
      continue
    }

    const bStart = toMinutes(r.requestedTime)
    const bEnd = bStart + r.requestedDuration
    const original: MinuteRange = { start: bStart, end: bEnd }
    const fragments = subtractMany(original, mergedCuts)

    if (fragments.length === 0) {
      continue
    }

    if (fragments.length === 1 && rangesEqual(fragments[0], original)) {
      out.push(r)
      continue
    }

    if (fragments.length === 1) {
      const f = fragments[0]
      out.push({
        ...r,
        requestedTime: minutesToTime(f.start),
        requestedDuration: f.end - f.start,
        updatedAt: nowIso,
      })
      continue
    }

    const [first, ...rest] = fragments
    out.push({
      ...r,
      requestedTime: minutesToTime(first.start),
      requestedDuration: first.end - first.start,
      updatedAt: nowIso,
    })
    for (const f of rest) {
      out.push({
        ...r,
        id: newAppointmentId(),
        requestedTime: minutesToTime(f.start),
        requestedDuration: f.end - f.start,
        createdAt: nowIso,
        updatedAt: nowIso,
      })
    }
  }

  return out
}

/**
 * Reconciles all dates that have at least one shop_close against bay_blockers on those dates.
 */
export function reconcileBayBlockersAgainstShopCloses(records: AppointmentRecord[]): AppointmentRecord[] {
  const dates = new Set(
    records
      .filter((r) => r.recordType === 'schedule_note' && r.scheduleBlockerType === 'shop_close')
      .map((r) => r.requestedDate)
  )
  if (dates.size === 0) {
    return records
  }
  let result = records
  for (const date of dates) {
    result = reconcileBayBlockersForDate(result, date)
  }
  return result
}
