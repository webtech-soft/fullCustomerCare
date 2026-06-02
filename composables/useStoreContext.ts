import { computed, ref } from 'vue'

export interface StoreOption {
  value: number
  label: string
}

const STORE_STORAGE_KEY = 'customer_care_selected_store_num'
const DEFAULT_STORE_NUM = 3

// TODO: Replace temporary options with server-provided stores.
const STORE_OPTIONS: StoreOption[] = [
  { value: 3, label: 'MAVERICK TIRE SMS TEST (Store #3)' },
  { value: 5, label: 'MAVERICK TIRE NORTH (Store #5)' },
  { value: 7, label: 'MAVERICK TIRE SOUTH (Store #7)' },
]

const selectedStoreNum = ref<number>(DEFAULT_STORE_NUM)
let initialized = false

function resolveStoreOption(storeNum: number): StoreOption {
  const match = STORE_OPTIONS.find((option) => option.value === storeNum)
  if (match) return match
  return {
    value: storeNum,
    label: `Store #${storeNum}`,
  }
}

function readStoredStoreNum(): number {
  if (typeof window === 'undefined') {
    return selectedStoreNum.value
  }
  const raw = localStorage.getItem(STORE_STORAGE_KEY)
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : DEFAULT_STORE_NUM
}

function ensureInitialized(): void {
  if (initialized || typeof window === 'undefined') return
  selectedStoreNum.value = readStoredStoreNum()
  initialized = true
}

function persistStoreNum(storeNum: number): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORE_STORAGE_KEY, String(storeNum))
}

export function getSelectedStoreNum(): number {
  if (typeof window !== 'undefined') {
    const storeNum = readStoredStoreNum()
    selectedStoreNum.value = storeNum
    return storeNum
  }
  return selectedStoreNum.value
}

export function useStoreContext() {
  ensureInitialized()

  const selectedStoreOption = computed(() => resolveStoreOption(selectedStoreNum.value))
  const selectedStoreLabel = computed(() => selectedStoreOption.value.label)

  function setSelectedStoreNum(storeNum: number): void {
    selectedStoreNum.value = storeNum
    persistStoreNum(storeNum)
  }

  return {
    storeOptions: STORE_OPTIONS,
    selectedStoreNum,
    selectedStoreOption,
    selectedStoreLabel,
    setSelectedStoreNum,
  }
}

const SESSION_KEYS_TO_CLEAR = [
  'current_user',
  'user_name',
  'role_ID',
  'customer_ID',
  'advisor_logged_in',
  'permission_cost',
  'permission_Chat',
  'HDN1',
  'HDN2',
]

const PASSWORD_KEY_CANDIDATES = [
  'password',
  'pwd',
  'remembered_password',
  'remember_password',
  'login_password',
]

const PASSWORD_KEY_PATTERN = /pass|pwd|remember/i

function clearStorageByPattern(storage: Storage, matcher: RegExp): void {
  const keysToRemove: string[] = []
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i)
    if (key && matcher.test(key)) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach((key) => storage.removeItem(key))
}

function clearSessionIdentityKeys(): void {
  if (typeof window === 'undefined') return
  SESSION_KEYS_TO_CLEAR.forEach((key) => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  })
}

function clearLikelyPasswordData(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  PASSWORD_KEY_CANDIDATES.forEach((key) => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  })

  clearStorageByPattern(localStorage, PASSWORD_KEY_PATTERN)
  clearStorageByPattern(sessionStorage, PASSWORD_KEY_PATTERN)

  const cookies = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
  for (const cookie of cookies) {
    const [rawName] = cookie.split('=')
    if (!rawName) continue
    const name = decodeURIComponent(rawName)
    if (!PASSWORD_KEY_PATTERN.test(name)) continue
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
  }
}

function redirectToLoginRoot(): void {
  if (typeof window === 'undefined') return
  window.location.assign('/')
}

export function signOutToRoot(): void {
  clearSessionIdentityKeys()
  redirectToLoginRoot()
}

export function signOutAndClearPasswordToRoot(): void {
  clearSessionIdentityKeys()
  clearLikelyPasswordData()
  redirectToLoginRoot()
}
