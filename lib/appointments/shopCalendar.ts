import { minutesToTime, toMinutes } from '@/lib/appointments/time'

/** First hour row on the calendar (00:00–00:59). */
export const GRID_START_HOUR = 0
/** Last hour row on the calendar (23:00–23:59). */
export const GRID_END_HOUR = 23

/** Shop opens at this hour (inclusive), on the hour grid. */
export const SHOP_OPEN_START_HOUR = 7
/** Shop closes at this clock time (exclusive): open through 18:59, closed from 19:00. */
export const SHOP_OPEN_END_HOUR = 19

/** Booking / suggestion slot increment (matches widget booking). */
export const BOOKING_SLOT_STEP_MINUTES = 30

export const SCROLL_TO_SHOP_OPEN_HOUR = 7
export const SLOT_HEIGHT_PX = 56

export interface ShopOpenBounds {
  startHour: number
  endHourExclusive: number
  stepMinutes: number
}

/** Per-store bounds (defaults until settings/API exist). */
export function getShopOpenBounds(_storeId?: string | number | null): ShopOpenBounds {
  return {
    startHour: SHOP_OPEN_START_HOUR,
    endHourExclusive: SHOP_OPEN_END_HOUR,
    stepMinutes: BOOKING_SLOT_STEP_MINUTES,
  }
}

/** Local calendar date YYYY-MM-DD (not UTC). */
export function formatLocalIsoDate(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

/** True if the given time (HH:mm) falls within shop-open minutes [07:00, 19:00). */
export function isShopOpenSlot(time: string): boolean {
  const m = toMinutes(time)
  return m >= SHOP_OPEN_START_HOUR * 60 && m < SHOP_OPEN_END_HOUR * 60
}

/**
 * List HH:mm start times on a calendar day within shop open bounds, in step increments.
 * Skips past times when `isoDate` is today (local).
 */
export function listOpenBookingTimesForDate(isoDate: string, now: Date = new Date()): string[] {
  const bounds = getShopOpenBounds()
  const isToday = isoDate === formatLocalIsoDate(now)
  const currentMinuteOfDay = now.getHours() * 60 + now.getMinutes()
  const endMinuteExclusive = bounds.endHourExclusive * 60
  const times: string[] = []
  for (let m = bounds.startHour * 60; m < endMinuteExclusive; m += bounds.stepMinutes) {
    const t = minutesToTime(m)
    if (!isShopOpenSlot(t)) continue
    if (isToday && m <= currentMinuteOfDay) continue
    times.push(t)
  }
  return times
}

export function scrollGridToShopOpenHour(el: HTMLElement | null) {
  if (!el) return
  requestAnimationFrame(() => {
    const targetTop = (SCROLL_TO_SHOP_OPEN_HOUR - GRID_START_HOUR) * SLOT_HEIGHT_PX
    const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight)
    el.scrollTop = Math.min(targetTop, maxScroll)
  })
}
