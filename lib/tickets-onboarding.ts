const TICKETS_WELCOME_SNOOZED_SESSION_KEY = 'customer-care:tickets-welcome-snoozed-session-v1'

const TICKETS_ONBOARDING_KEY = 'customer-care:tickets-onboarding-v1'
const TICKETS_ONBOARDING_ADVANCED_KEY = 'customer-care:tickets-onboarding-advanced-v1'
const TICKETS_ONBOARDING_PRESET_BUILDER_KEY = 'customer-care:tickets-onboarding-preset-builder-v1'

export type TicketsOnboardingState = 'not_seen' | 'skipped' | 'completed'
export type TicketsAdvancedOnboardingState = 'not_seen' | 'skipped' | 'completed'
export type TicketsPresetBuilderOnboardingState = 'not_seen' | 'skipped' | 'completed'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function canUseSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

/** When set, the first-visit welcome modal is suppressed until the browser session ends. */
export function isTicketsWelcomeSnoozedThisSession(): boolean {
  if (!canUseSessionStorage()) return false
  return window.sessionStorage.getItem(TICKETS_WELCOME_SNOOZED_SESSION_KEY) === '1'
}

export function snoozeTicketsWelcomeForSession(): void {
  if (!canUseSessionStorage()) return
  window.sessionStorage.setItem(TICKETS_WELCOME_SNOOZED_SESSION_KEY, '1')
}

export function clearTicketsWelcomeSnoozeForSession(): void {
  if (!canUseSessionStorage()) return
  window.sessionStorage.removeItem(TICKETS_WELCOME_SNOOZED_SESSION_KEY)
}

export function readTicketsOnboardingState(): TicketsOnboardingState {
  if (!canUseStorage()) return 'not_seen'
  const raw = window.localStorage.getItem(TICKETS_ONBOARDING_KEY)
  if (raw === 'skipped' || raw === 'completed') return raw
  return 'not_seen'
}

export function markTicketsOnboardingSkipped(): void {
  if (!canUseStorage()) return
  window.localStorage.setItem(TICKETS_ONBOARDING_KEY, 'skipped')
}

export function markTicketsOnboardingCompleted(): void {
  if (!canUseStorage()) return
  window.localStorage.setItem(TICKETS_ONBOARDING_KEY, 'completed')
}

export function clearTicketsOnboardingState(): void {
  if (!canUseStorage()) return
  window.localStorage.removeItem(TICKETS_ONBOARDING_KEY)
}

export function readTicketsAdvancedOnboardingState(): TicketsAdvancedOnboardingState {
  if (!canUseStorage()) return 'not_seen'
  const raw = window.localStorage.getItem(TICKETS_ONBOARDING_ADVANCED_KEY)
  if (raw === 'skipped' || raw === 'completed') return raw
  return 'not_seen'
}

export function markTicketsAdvancedOnboardingSkipped(): void {
  if (!canUseStorage()) return
  window.localStorage.setItem(TICKETS_ONBOARDING_ADVANCED_KEY, 'skipped')
}

export function markTicketsAdvancedOnboardingCompleted(): void {
  if (!canUseStorage()) return
  window.localStorage.setItem(TICKETS_ONBOARDING_ADVANCED_KEY, 'completed')
}

export function clearTicketsAdvancedOnboardingState(): void {
  if (!canUseStorage()) return
  window.localStorage.removeItem(TICKETS_ONBOARDING_ADVANCED_KEY)
}

export function readTicketsPresetBuilderOnboardingState(): TicketsPresetBuilderOnboardingState {
  if (!canUseStorage()) return 'not_seen'
  const raw = window.localStorage.getItem(TICKETS_ONBOARDING_PRESET_BUILDER_KEY)
  if (raw === 'skipped' || raw === 'completed') return raw
  return 'not_seen'
}

export function markTicketsPresetBuilderOnboardingSkipped(): void {
  if (!canUseStorage()) return
  window.localStorage.setItem(TICKETS_ONBOARDING_PRESET_BUILDER_KEY, 'skipped')
}

export function markTicketsPresetBuilderOnboardingCompleted(): void {
  if (!canUseStorage()) return
  window.localStorage.setItem(TICKETS_ONBOARDING_PRESET_BUILDER_KEY, 'completed')
}

export function clearTicketsPresetBuilderOnboardingState(): void {
  if (!canUseStorage()) return
  window.localStorage.removeItem(TICKETS_ONBOARDING_PRESET_BUILDER_KEY)
}
