import type { AppointmentRecord } from '@/types/appointment'
import { canDropInBaySlot } from '@/api/appointments'
import { getWeekStart } from '@/lib/appointments/time'
import {
  formatLocalIsoDate,
  isShopOpenSlot,
  listOpenBookingTimesForDate,
} from '@/lib/appointments/shopCalendar'

export type RescheduleSuggestionSlot = { date: string; time: string }

export function isFutureRescheduleSlot(date: string, time: string, now: Date = new Date()): boolean {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const slotDate = new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0, 0)
  if (Number.isNaN(slotDate.getTime())) return false
  return slotDate.getTime() > now.getTime()
}

function addDaysIso(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + deltaDays)
  return formatLocalIsoDate(dt)
}

async function pushIfValid(
  record: AppointmentRecord,
  date: string,
  time: string,
  seen: Set<string>,
  ordered: RescheduleSuggestionSlot[]
): Promise<boolean> {
  const key = `${date}|${time}`
  if (seen.has(key)) return false
  if (!isShopOpenSlot(time)) return false
  if (!isFutureRescheduleSlot(date, time)) return false
  const ok = await canDropInBaySlot({
    bayId: record.bayId || 'NB',
    date,
    requestedTime: time,
    duration: record.requestedDuration,
    movingRecordId: record.id,
    targetRecordType: 'confirmed',
  })
  if (!ok) return false
  seen.add(key)
  ordered.push({ date, time })
  return true
}

/**
 * Ranked reschedule suggestions per product rules (deduped, shop-open + bay slot checks).
 */
export async function buildRescheduleSuggestions(
  record: AppointmentRecord,
  now: Date = new Date()
): Promise<RescheduleSuggestionSlot[]> {
  const ordered: RescheduleSuggestionSlot[] = []
  const seen = new Set<string>()
  const d0 = record.requestedDate
  const t0 = record.requestedTime

  // 1) Same time, +7 calendar days
  await pushIfValid(record, addDaysIso(d0, 7), t0, seen, ordered)

  // 2) Same time, next calendar day
  await pushIfValid(record, addDaysIso(d0, 1), t0, seen, ordered)

  // 3) First available on the next calendar day
  const dNext = addDaysIso(d0, 1)
  for (const t of listOpenBookingTimesForDate(dNext, now)) {
    const added = await pushIfValid(record, dNext, t, seen, ordered)
    if (added) break
  }

  // 4) Same time on other days in the Sun–Sat week containing d0
  const ref = new Date(`${d0}T12:00:00`)
  const weekStart = getWeekStart(ref)
  for (let i = 0; i < 7; i++) {
    const date = addDaysIso(formatLocalIsoDate(weekStart), i)
    if (date === d0) continue
    await pushIfValid(record, date, t0, seen, ordered)
  }

  // 5) First available slot on each subsequent calendar day (walk forward)
  const MAX_TOTAL = 20
  for (let delta = 2; delta <= 60 && ordered.length < MAX_TOTAL; delta++) {
    const date = addDaysIso(d0, delta)
    for (const t of listOpenBookingTimesForDate(date, now)) {
      await pushIfValid(record, date, t, seen, ordered)
      break
    }
  }

  return ordered.slice(0, 15)
}
