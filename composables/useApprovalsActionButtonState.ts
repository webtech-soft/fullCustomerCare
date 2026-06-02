import { onUnmounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import {
  getAllWorkApprovalTicketNumbers,
  getWorkApproval,
  type WorkApprovalRecordV1,
} from '@/lib/work-approvals'

/** 5 minutes — same window as before the Approvals action was split from Timeline. */
export const APPROVALS_ACTION_FLASH_MS = 5 * 60 * 1000

/** Kept for backward compatibility with existing user dismissals in localStorage. */
const APPROVALS_ACTION_DISMISSALS_STORAGE_KEY = 'timeline_approval_flash_dismissals_v1'

type ApprovalsActionButtonState = 'default' | 'flashingApproved' | 'solidApproved'
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
  const parsed = safeParseJson<unknown>(
    window.localStorage.getItem(APPROVALS_ACTION_DISMISSALS_STORAGE_KEY)
  )
  if (!parsed || typeof parsed !== 'object') return {}
  return parsed as DismissalStore
}

function setDismissalStore(next: DismissalStore): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(APPROVALS_ACTION_DISMISSALS_STORAGE_KEY, JSON.stringify(next))
}

function getApprovalTimestampMs(record: WorkApprovalRecordV1): number | null {
  const fromUpdatedAt = Date.parse(record.updatedAtIso)
  if (Number.isFinite(fromUpdatedAt)) {
    return fromUpdatedAt
  }

  const latestItemIso = record.items.reduce<string | null>((latest, item) => {
    if (!item.approvedAtIso) return latest
    if (!latest) return item.approvedAtIso
    return item.approvedAtIso > latest ? item.approvedAtIso : latest
  }, null)

  if (!latestItemIso) return null
  const fromItems = Date.parse(latestItemIso)
  return Number.isFinite(fromItems) ? fromItems : null
}

function getApprovalVersionKey(record: WorkApprovalRecordV1): string {
  return record.updatedAtIso || `${record.items.length}`
}

function getButtonState(ticketNumber: number, nowMs: number): ApprovalsActionButtonState {
  const approval = getWorkApproval(ticketNumber)
  if (!approval || approval.items.length === 0) return 'default'

  const approvalVersionKey = getApprovalVersionKey(approval)
  const dismissalStore = getDismissalStore()
  if (dismissalStore[String(ticketNumber)] === approvalVersionKey) {
    return 'solidApproved'
  }

  const approvalTimestampMs = getApprovalTimestampMs(approval)
  if (approvalTimestampMs == null) return 'solidApproved'

  return nowMs - approvalTimestampMs < APPROVALS_ACTION_FLASH_MS
    ? 'flashingApproved'
    : 'solidApproved'
}

function getButtonClassForState(state: ApprovalsActionButtonState): string {
  if (state === 'flashingApproved') {
    return 'bg-brand-accent hover:bg-brand-accent-hover text-white border-brand-accent animate-pulse'
  }
  if (state === 'solidApproved') {
    return 'bg-brand-accent hover:bg-brand-accent-hover text-white border-brand-accent'
  }
  return ''
}

export function useApprovalsActionButtonState(approvalUpdateTrigger?: MaybeRefOrGetter<number | undefined>) {
  const nowMs = ref(Date.now())
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const scheduleNextTransition = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }

    if (typeof window === 'undefined') return

    const allApprovals = getAllWorkApprovalTicketNumbers()
      .map((ticketNumber) => getWorkApproval(ticketNumber))
      .filter((record): record is WorkApprovalRecordV1 => !!record && Array.isArray(record.items) && record.items.length > 0)

    const dismissals = getDismissalStore()
    const now = Date.now()
    let nextTransitionMs: number | null = null

    for (const record of allApprovals) {
      const ticketKey = String(record.ticketNumber)
      if (dismissals[ticketKey] === getApprovalVersionKey(record)) continue

      const ts = getApprovalTimestampMs(record)
      if (ts == null) continue

      const transitionAt = ts + APPROVALS_ACTION_FLASH_MS
      const msUntil = transitionAt - now
      if (msUntil <= 0) continue
      if (nextTransitionMs == null || msUntil < nextTransitionMs) {
        nextTransitionMs = msUntil
      }
    }

    if (nextTransitionMs == null) return

    timeoutId = setTimeout(() => {
      nowMs.value = Date.now()
      scheduleNextTransition()
    }, Math.max(50, nextTransitionMs))
  }

  const refresh = () => {
    nowMs.value = Date.now()
    scheduleNextTransition()
  }

  watch(
    () => (approvalUpdateTrigger != null ? toValue(approvalUpdateTrigger) : undefined),
    refresh,
    { immediate: true }
  )

  onUnmounted(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  })

  const getApprovalsActionButtonState = (ticketNumber: number): ApprovalsActionButtonState =>
    getButtonState(ticketNumber, nowMs.value)

  const getApprovalsActionButtonClass = (ticketNumber: number): string =>
    getButtonClassForState(getApprovalsActionButtonState(ticketNumber))

  const markApprovalsActionFlashDismissed = (ticketNumber: number): void => {
    const approval = getWorkApproval(ticketNumber)
    if (!approval || approval.items.length === 0) return
    const store = getDismissalStore()
    store[String(ticketNumber)] = getApprovalVersionKey(approval)
    setDismissalStore(store)
    refresh()
  }

  return {
    getApprovalsActionButtonState,
    getApprovalsActionButtonClass,
    markApprovalsActionFlashDismissed,
  }
}
