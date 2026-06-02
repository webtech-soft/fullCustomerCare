import { ref, type Ref } from 'vue'

const STORAGE_KEY = 'customer-care-theme'

export type ColorMode = 'light' | 'dark'

/** Synced with `document.documentElement` class `dark` */
export const isDark: Ref<boolean> = ref(false)

function getPreferred(): ColorMode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyColorMode(mode: ColorMode): void {
  document.documentElement.classList.toggle('dark', mode === 'dark')
  isDark.value = mode === 'dark'
}

/** Call once before mount. Resolves theme from localStorage or system preference. */
export function initColorMode(): void {
  const raw = localStorage.getItem(STORAGE_KEY)
  const mode: ColorMode = raw === 'dark' || raw === 'light' ? raw : getPreferred()
  applyColorMode(mode)

  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return
    if (e.newValue === 'light' || e.newValue === 'dark') {
      applyColorMode(e.newValue)
    }
  })
}

export function persistColorMode(dark: boolean): void {
  const mode: ColorMode = dark ? 'dark' : 'light'
  localStorage.setItem(STORAGE_KEY, mode)
  applyColorMode(mode)
}

export function useColorMode(): {
  isDark: Ref<boolean>
  toggle: () => void
  setDark: (value: boolean) => void
} {
  return {
    isDark,
    toggle: () => persistColorMode(!isDark.value),
    setDark: persistColorMode,
  }
}
