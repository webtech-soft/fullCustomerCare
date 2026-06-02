import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'

export type MobileSidebarContext = {
  mobileSidebarOpen: Ref<boolean>
  toggleMobileSidebar: () => void
  setMobileSidebarOpen: (open: boolean) => void
}

export const MOBILE_SIDEBAR_KEY: InjectionKey<MobileSidebarContext> =
  Symbol('mobileSidebar')

export function provideMobileSidebar(): MobileSidebarContext {
  const mobileSidebarOpen = ref(false)
  const toggleMobileSidebar = () => {
    mobileSidebarOpen.value = !mobileSidebarOpen.value
  }
  const setMobileSidebarOpen = (open: boolean) => {
    mobileSidebarOpen.value = open
  }
  const ctx: MobileSidebarContext = {
    mobileSidebarOpen,
    toggleMobileSidebar,
    setMobileSidebarOpen,
  }
  provide(MOBILE_SIDEBAR_KEY, ctx)
  return ctx
}

export function useMobileSidebar(): MobileSidebarContext {
  const ctx = inject(MOBILE_SIDEBAR_KEY)
  if (!ctx) {
    throw new Error(
      'useMobileSidebar requires provideMobileSidebar() from MainLayout',
    )
  }
  return ctx
}
