const STORAGE_KEY = 'cc.userDialogPrefs.v1'

export type UserDialogPrefsMap = Record<string, boolean>

function readAll(): UserDialogPrefsMap {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as UserDialogPrefsMap
  } catch {
    return {}
  }
}

function writeAll(map: UserDialogPrefsMap) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore quota / private mode
  }
}

export function isUserDialogSuppressed(key: string): boolean {
  return !!readAll()[key]
}

export function setUserDialogSuppressed(key: string, suppressed: boolean) {
  const next = { ...readAll() }
  if (suppressed) next[key] = true
  else delete next[key]
  writeAll(next)
}
