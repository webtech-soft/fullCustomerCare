import { computed } from 'vue'
import {
  devUserContextRevision,
  getDevUserContext,
  isDevUserContextLoaded,
} from '@/composables/useDevUserContext'

/**
 * Storage keys for session-based permissions (set by PHP/backend or app bootstrap).
 * When a key is missing, we treat as allowed so existing behavior is preserved
 * until the backend wires these values.
 */
const PERMISSION_COST_KEY = 'permission_cost'
const PERMISSION_CHAT_KEY = 'permission_Chat'
export const HDN1_KEY = 'HDN1'
export const HDN2_KEY = 'HDN2'

/** HDN1 values that allow SMS/chat when combined with permission_Chat. */
const HDN1_CHAT_ALLOWED = new Set(['1', '4', '6'])

function readBool(key: string, defaultValue = true): boolean {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return defaultValue
  const v = globalThis.localStorage.getItem(key)
  if (v === null || v === undefined) return defaultValue
  return v === '1' || v === 'true' || v === 'yes'
}

/** Reads HDN1 from localStorage (legacy PHP session digit 0–7). */
export function readHdn1(): string {
  return readSessionStorageValue(HDN1_KEY)
}

/** True when HDN1 is 1, 4, or 6 (chat-capable role codes). */
export function isChatAllowedByHdn1(hdn1: string): boolean {
  return HDN1_CHAT_ALLOWED.has(String(hdn1).trim())
}

/** Prod chat gate: permission_Chat and allowed HDN1. */
export function isProdChatAllowed(): boolean {
  return readBool(PERMISSION_CHAT_KEY) && isChatAllowedByHdn1(readHdn1())
}

function readSessionStorageValue(key: string): string {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return ''
  try {
    return globalThis.localStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

/**
 * Reads HDN2 from dev JSON (when loaded) or localStorage.
 * "1" = hide financial data; "0" or missing = show.
 */
export function readHdn2(): string {
  if (import.meta.env.DEV && isDevUserContextLoaded()) {
    const dev = getDevUserContext().HDN2
    if (dev === '1' || dev === '0') return dev
  }
  return readSessionStorageValue(HDN2_KEY)
}

/** True when HDN2 hides price/cost/total/GP% in staff UI. */
export function isFinancialHiddenByHdn2(): boolean {
  return readHdn2() === '1'
}

/**
 * Composable for ticket page permission checks (cost, chat, financial display, etc.).
 * Matches legacy PHP: cost gates View actions; Chat + HDN1 ∈ {1,4,6} gate SMS/chat; HDN2 gates dollar amounts.
 * In Vite dev, chat is treated as enabled so local work does not depend on HDN1/session from PHP.
 */
export function usePermissions() {
  const hasCost = computed(() => readBool(PERMISSION_COST_KEY))
  const hasChat = computed(() => {
    if (import.meta.env.DEV) return true
    return isProdChatAllowed()
  })
  const canViewFinancial = computed(() => {
    devUserContextRevision.value
    return !isFinancialHiddenByHdn2()
  })
  return { hasCost, hasChat, canViewFinancial }
}
