import { ref } from 'vue'

export interface DevUserContext {
  user_name: string
  role_ID: number
  customer_ID: string
  /** "1" = hide financial data in staff UI; "0" = show */
  HDN2: string
}

const EMPTY_CONTEXT: DevUserContext = {
  user_name: '',
  role_ID: 0,
  customer_ID: '',
  HDN2: '',
}

let cachedContext: DevUserContext | null = null
let loadPromise: Promise<DevUserContext> | null = null

/** Bumped when dev JSON loads so permission computeds re-read context. */
export const devUserContextRevision = ref(0)

function normalizeHdn2(raw: unknown): string {
  if (raw === null || raw === undefined) return ''
  const s = String(raw).trim()
  if (s === '1' || s === '0') return s
  return ''
}

function normalizeContext(raw: unknown): DevUserContext {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_CONTEXT }
  const row = raw as Record<string, unknown>
  const user_name =
    typeof row.user_name === 'string'
      ? row.user_name.trim()
      : typeof row.current_user === 'string'
        ? row.current_user.trim()
        : ''
  const role_ID_raw = row.role_ID
  const parsedRole =
    typeof role_ID_raw === 'number'
      ? role_ID_raw
      : Number.parseInt(String(role_ID_raw ?? '0'), 10)
  const role_ID = Number.isNaN(parsedRole) ? 0 : parsedRole
  const customer_ID = String(row.customer_ID ?? '').trim()
  const HDN2 = normalizeHdn2(row.HDN2)
  return { user_name, role_ID, customer_ID, HDN2 }
}

export async function loadDevUserContext(): Promise<DevUserContext> {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return { ...EMPTY_CONTEXT }
  }
  if (cachedContext) return cachedContext
  if (loadPromise) return loadPromise

  loadPromise = fetch('/dev-user-context.json', { cache: 'no-store' })
    .then(async (res) => {
      if (!res.ok) return { ...EMPTY_CONTEXT }
      const json = await res.json().catch(() => null)
      return normalizeContext(json)
    })
    .catch(() => ({ ...EMPTY_CONTEXT }))
    .then((ctx) => {
      cachedContext = ctx
      devUserContextRevision.value++
      return ctx
    })

  return loadPromise
}

export function getDevUserContext(): DevUserContext {
  return cachedContext ?? { ...EMPTY_CONTEXT }
}

/** True after `loadDevUserContext()` has resolved in DEV (including failed fetch → empty object cached). */
export function isDevUserContextLoaded(): boolean {
  return import.meta.env.DEV && cachedContext !== null
}

/** @internal Test helper — reset cached dev context between tests. */
export function resetDevUserContextForTests(): void {
  cachedContext = null
  loadPromise = null
  devUserContextRevision.value = 0
}

/** @internal Test helper — inject dev context without fetch. */
export function setDevUserContextForTests(ctx: Partial<DevUserContext>): void {
  cachedContext = { ...EMPTY_CONTEXT, ...ctx }
  devUserContextRevision.value++
}
