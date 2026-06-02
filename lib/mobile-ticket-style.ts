/** Narrow breakpoint aligned with Tailwind `sm` (TicketsPage uses `max-sm` / 639px). */
const NARROW_MEDIA = '(max-width: 639px)'

const MOBILE_TABLE_OVERRIDE_KEY = 'tickets_mobile_table_override'
const MOBILE_TABLE_NOT_OPTIMIZED_DISMISSED_KEY = 'tickets_mobile_table_not_optimized_dismissed'

export function isNarrowViewportForTicketStyle(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(NARROW_MEDIA).matches
}

export function readMobileTableOverride(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(MOBILE_TABLE_OVERRIDE_KEY) === '1'
}

export function setMobileTableOverride(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(MOBILE_TABLE_OVERRIDE_KEY, '1')
}

export function clearMobileTableOverride(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(MOBILE_TABLE_OVERRIDE_KEY)
}

export function readMobileTableNotOptimizedDismissed(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(MOBILE_TABLE_NOT_OPTIMIZED_DISMISSED_KEY) === '1'
}

export function setMobileTableNotOptimizedDismissed(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(MOBILE_TABLE_NOT_OPTIMIZED_DISMISSED_KEY, '1')
}

export function clearMobileTableNotOptimizedDismissed(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(MOBILE_TABLE_NOT_OPTIMIZED_DISMISSED_KEY)
}
