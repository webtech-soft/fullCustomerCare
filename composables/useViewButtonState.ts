import { onUnmounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import {
  getAllInvoiceViewStatusTicketNumbers,
  getInvoiceViewStatus,
  type InvoiceViewStatus,
} from '@/lib/invoice-view-tracker'

export const VIEW_BUTTON_FLASH_MS = 5 * 60 * 1000
const VIEW_BUTTON_DISMISSALS_KEY = 'view_button_flash_dismissals_v1'

type ViewButtonState = 'default' | 'flashingViewed' | 'solidViewed'
type DismissalStore = Record<string, string>

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function getDismissalStore(): DismissalStore {
  if (typeof window === 'undefined') return {}
  const parsed = safeParseJson<unknown>(window.localStorage.getItem(VIEW_BUTTON_DISMISSALS_KEY))
  if (!parsed || typeof parsed !== 'object') return {}
  return parsed as DismissalStore
}

function setDismissalStore(next: DismissalStore): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(VIEW_BUTTON_DISMISSALS_KEY, JSON.stringify(next))
}

function getViewVersionKey(status: InvoiceViewStatus): string {
  const tokenPart = status.token ?? ''
  return `${status.firstViewed}:${tokenPart}`
}

function getButtonState(ticketNumber: number, nowMs: number): ViewButtonState {
  const status = getInvoiceViewStatus(ticketNumber)
  if (!status || !status.isViewed) return 'default'

  const viewVersionKey = getViewVersionKey(status)
  const dismissals = getDismissalStore()
  if (dismissals[String(ticketNumber)] === viewVersionKey) {
    return 'solidViewed'
  }

  const elapsedMs = nowMs - status.lastActive
  return elapsedMs < VIEW_BUTTON_FLASH_MS ? 'flashingViewed' : 'solidViewed'
}

/** Shared with tour demo rows that simulate an already-viewed invoice (no localStorage). */
export const VIEW_BUTTON_SOLID_VIEWED_CLASS =
  'bg-brand-accent hover:bg-brand-accent-hover text-white border-brand-accent'

function getButtonClassForState(state: ViewButtonState): string {
  if (state === 'flashingViewed') {
    return `${VIEW_BUTTON_SOLID_VIEWED_CLASS} animate-pulse`
  }
  if (state === 'solidViewed') {
    return VIEW_BUTTON_SOLID_VIEWED_CLASS
  }
  return ''
}

export function useViewButtonState(viewStatusUpdateTrigger?: MaybeRefOrGetter<number | undefined>) {
  const nowMs = ref(Date.now())
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const scheduleNextTransition = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    if (typeof window === 'undefined') return

    const now = Date.now()
    const dismissals = getDismissalStore()
    let nextMsUntilSolid: number | null = null

    for (const ticketNumber of getAllInvoiceViewStatusTicketNumbers()) {
      const status = getInvoiceViewStatus(ticketNumber)
      if (!status || !status.isViewed) continue
      if (dismissals[String(ticketNumber)] === getViewVersionKey(status)) continue

      const msUntilSolid = status.lastActive + VIEW_BUTTON_FLASH_MS - now
      if (msUntilSolid <= 0) continue
      if (nextMsUntilSolid == null || msUntilSolid < nextMsUntilSolid) {
        nextMsUntilSolid = msUntilSolid
      }
    }

    if (nextMsUntilSolid == null) return
    timeoutId = setTimeout(() => {
      nowMs.value = Date.now()
      scheduleNextTransition()
    }, Math.max(50, nextMsUntilSolid))
  }

  const refresh = () => {
    nowMs.value = Date.now()
    scheduleNextTransition()
  }

  watch(
    () => (viewStatusUpdateTrigger != null ? toValue(viewStatusUpdateTrigger) : undefined),
    refresh,
    { immediate: true }
  )

  onUnmounted(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  })

  const getViewButtonState = (ticketNumber: number): ViewButtonState =>
    getButtonState(ticketNumber, nowMs.value)

  const getViewButtonClass = (ticketNumber: number): string =>
    getButtonClassForState(getViewButtonState(ticketNumber))

  const dismissViewButtonFlash = (ticketNumber: number): void => {
    const status = getInvoiceViewStatus(ticketNumber)
    if (!status || !status.isViewed) return

    const store = getDismissalStore()
    store[String(ticketNumber)] = getViewVersionKey(status)
    setDismissalStore(store)
    refresh()
  }

  return {
    getViewButtonState,
    getViewButtonClass,
    dismissViewButtonFlash,
  }
}
