import { onUnmounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import {
  getAllInspectionViewStatusTicketNumbers,
  getInspectionViewStatus,
  type InspectionViewStatus,
} from '@/lib/inspection-view-tracker'

export const INSPECTION_VIEW_BUTTON_FLASH_MS = 5 * 60 * 1000
const INSPECTION_BUTTON_DISMISSALS_KEY = 'inspection_button_flash_dismissals_v1'

type InspectionViewButtonState = 'default' | 'flashingViewed' | 'solidViewed'
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
  const parsed = safeParseJson<unknown>(window.localStorage.getItem(INSPECTION_BUTTON_DISMISSALS_KEY))
  if (!parsed || typeof parsed !== 'object') return {}
  return parsed as DismissalStore
}

function setDismissalStore(next: DismissalStore): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(INSPECTION_BUTTON_DISMISSALS_KEY, JSON.stringify(next))
}

function getInspectionViewVersionKey(status: InspectionViewStatus): string {
  const tokenPart = status.token ?? ''
  return `${status.firstViewed}:${tokenPart}`
}

function getButtonState(ticketNumber: number, nowMs: number): InspectionViewButtonState {
  const status = getInspectionViewStatus(ticketNumber)
  if (!status || !status.isViewed) return 'default'

  const viewVersionKey = getInspectionViewVersionKey(status)
  const dismissals = getDismissalStore()
  if (dismissals[String(ticketNumber)] === viewVersionKey) {
    return 'solidViewed'
  }

  const elapsedMs = nowMs - status.lastActive
  return elapsedMs < INSPECTION_VIEW_BUTTON_FLASH_MS ? 'flashingViewed' : 'solidViewed'
}

/**
 * Inspection-complete uses the same theme fill as View / Approvals (see VIEW_BUTTON_SOLID_VIEWED_CLASS).
 * This composable only adds motion when the customer is actively in the post-view flash window.
 */
function getButtonClassForState(state: InspectionViewButtonState): string {
  if (state === 'flashingViewed') return 'animate-pulse'
  return ''
}

export function useInspectionViewButtonState(
  inspectionViewUpdateTrigger?: MaybeRefOrGetter<number | undefined>
) {
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

    for (const ticketNumber of getAllInspectionViewStatusTicketNumbers()) {
      const status = getInspectionViewStatus(ticketNumber)
      if (!status || !status.isViewed) continue
      if (dismissals[String(ticketNumber)] === getInspectionViewVersionKey(status)) continue

      const msUntilSolid = status.lastActive + INSPECTION_VIEW_BUTTON_FLASH_MS - now
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
    () => (inspectionViewUpdateTrigger != null ? toValue(inspectionViewUpdateTrigger) : undefined),
    refresh,
    { immediate: true }
  )

  onUnmounted(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  })

  const getInspectionViewButtonState = (ticketNumber: number): InspectionViewButtonState =>
    getButtonState(ticketNumber, nowMs.value)

  const getInspectionViewButtonClass = (ticketNumber: number): string =>
    getButtonClassForState(getInspectionViewButtonState(ticketNumber))

  const dismissInspectionViewButtonFlash = (ticketNumber: number): void => {
    const status = getInspectionViewStatus(ticketNumber)
    if (!status || !status.isViewed) return

    const store = getDismissalStore()
    store[String(ticketNumber)] = getInspectionViewVersionKey(status)
    setDismissalStore(store)
    refresh()
  }

  return {
    getInspectionViewButtonState,
    getInspectionViewButtonClass,
    dismissInspectionViewButtonFlash,
  }
}
