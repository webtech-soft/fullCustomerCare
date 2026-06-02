<template>
  <div class="relative w-full border-b bg-brand-shell border-border">
    <div
      class="mx-auto max-w-[2130px] px-2 sm:px-4 lg:px-8"
      :class="{ 'pr-11 sm:pr-12 lg:pr-[3.25rem]': isTicketsRoute }"
    >
      <div class="flex items-center justify-between gap-2">
        <div class="flex min-w-0 flex-1 items-center gap-1">
          <button
            v-if="!mobileSidebarOpen"
            type="button"
            class="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-transparent text-brand-ink hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Open sidebar"
            @click="toggleMobileSidebar"
          >
            <span class="flex flex-col gap-1" aria-hidden="true">
              <span class="block h-0.5 w-5 rounded bg-current" />
              <span class="block h-0.5 w-5 rounded bg-current" />
              <span class="block h-0.5 w-5 rounded bg-current" />
            </span>
          </button>
          <div class="min-w-0 flex-1 overflow-x-auto scrollbar-hide -mx-2 px-2">
            <div class="flex space-x-1 min-w-max">
              <router-link
                v-for="tab in tabs"
                :key="tab.name"
                :to="tab.href"
                :aria-current="isActive(tab.href) ? 'page' : undefined"
                :class="cn(
                  'px-3 sm:px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap',
                  isActive(tab.href)
                    ? 'border-b-2 border-brand-accent text-brand-accent'
                    : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground'
                )"
              >
                {{ tab.name }}
              </router-link>
            </div>
          </div>
        </div>
        <div ref="menuContainerRef" class="relative flex shrink-0 items-center gap-2">
          <div class="hidden sm:block text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            {{ headerUserLabel }} | {{ selectedStoreLabel }}
          </div>
          <button
            ref="userMenuTriggerRef"
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            :aria-label="isUserMenuOpen ? 'Close user options' : 'Open user options'"
            :aria-expanded="isUserMenuOpen ? 'true' : 'false'"
            aria-haspopup="dialog"
            aria-controls="topnav-user-options"
            @click="toggleUserMenu"
          >
            <PhUserCircle :size="22" weight="duotone" />
          </button>

          <div
            v-if="isUserMenuOpen"
            id="topnav-user-options"
            class="absolute right-0 top-full z-50 mt-2 w-72 rounded-md border border-border bg-card p-3 text-card-foreground shadow-md"
            role="dialog"
            aria-modal="false"
            aria-label="User options menu"
            tabindex="-1"
          >
            <div class="space-y-3">
              <label class="block text-xs font-semibold uppercase tracking-wide text-muted-foreground" for="store-selector">
                Set Store
              </label>
              <select
                ref="storeSelectorRef"
                id="store-selector"
                :value="selectedStoreNum"
                class="block h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                @change="handleStoreChange"
              >
                <option
                  v-for="store in storeOptions"
                  :key="store.value"
                  :value="store.value"
                >
                  {{ store.label }}
                </option>
              </select>

              <div class="border-t border-border" aria-hidden="true" />

              <button
                type="button"
                class="inline-flex w-full items-center justify-between rounded-md border border-destructive/30 px-3 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                @click="handleSignOut"
              >
                <span>Sign out</span>
                <PhSignOut :size="18" />
              </button>

              <button
                type="button"
                class="inline-flex w-full items-center justify-between rounded-md bg-primary px-3 py-2 text-left text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                @click="handleSignOutAndClearPassword"
              >
                <span>Sign out and clear password</span>
                <PhEraser :size="18" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { PhEraser, PhSignOut, PhUserCircle } from '@phosphor-icons/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { cn } from '@/lib/utils'
import { getDevUserContext, loadDevUserContext } from '@/composables/useDevUserContext'
import { useMobileSidebar } from '@/composables/useMobileSidebar'
import {
  signOutAndClearPasswordToRoot,
  signOutToRoot,
  useStoreContext,
} from '@/composables/useStoreContext'

const route = useRoute()
const { mobileSidebarOpen, toggleMobileSidebar } = useMobileSidebar()
const { storeOptions, selectedStoreNum, selectedStoreLabel, setSelectedStoreNum } = useStoreContext()
const isUserMenuOpen = ref(false)
const menuContainerRef = ref<HTMLElement | null>(null)
const userMenuTriggerRef = ref<HTMLButtonElement | null>(null)
const storeSelectorRef = ref<HTMLSelectElement | null>(null)

const isTicketsRoute = computed(() => {
  const p = route.path
  return p === '/' || p === '/tickets'
})

/** Matches TicketsPage / preferences: dev JSON in DEV, then localStorage, then legacy placeholder. */
function resolveHeaderUserName(): string {
  const devCtx = import.meta.env.DEV ? getDevUserContext() : { user_name: '' as string }
  const fromDevOrStorage = (
    devCtx.user_name ||
    (typeof window !== 'undefined' ? localStorage.getItem('current_user') : null) ||
    (typeof window !== 'undefined' ? localStorage.getItem('user_name') : null) ||
    ''
  ).trim()
  return fromDevOrStorage || 'AATECH'
}

const headerUserLabel = ref(resolveHeaderUserName())

function closeUserMenu(options?: { returnFocus?: boolean }): void {
  const shouldReturnFocus = options?.returnFocus === true
  isUserMenuOpen.value = false
  if (!shouldReturnFocus) return
  void nextTick(() => {
    userMenuTriggerRef.value?.focus()
  })
}

function toggleUserMenu(): void {
  if (isUserMenuOpen.value) {
    closeUserMenu({ returnFocus: true })
    return
  }
  isUserMenuOpen.value = true
  void nextTick(() => {
    storeSelectorRef.value?.focus()
  })
}

function handleStoreChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  const nextStoreNum = Number.parseInt(target.value, 10)
  if (!Number.isFinite(nextStoreNum)) return
  setSelectedStoreNum(nextStoreNum)
}

function handleSignOut(): void {
  closeUserMenu()
  signOutToRoot()
}

function handleSignOutAndClearPassword(): void {
  closeUserMenu()
  signOutAndClearPasswordToRoot()
}

function handleGlobalPointerDown(event: MouseEvent): void {
  if (!isUserMenuOpen.value || !menuContainerRef.value) return
  const targetNode = event.target as Node | null
  if (!targetNode) return
  if (!menuContainerRef.value.contains(targetNode)) {
    closeUserMenu()
  }
}

function handleGlobalKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && isUserMenuOpen.value) {
    event.preventDefault()
    closeUserMenu({ returnFocus: true })
  }
}

onMounted(async () => {
  if (import.meta.env.DEV) {
    await loadDevUserContext()
  }
  headerUserLabel.value = resolveHeaderUserName()
  document.addEventListener('mousedown', handleGlobalPointerDown)
  document.addEventListener('keydown', handleGlobalKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleGlobalPointerDown)
  document.removeEventListener('keydown', handleGlobalKeydown)
})

const tabs = [
  { name: 'Appointments', href: '/appointments' },
  { name: 'Check In', href: '/check-in' },
  { name: 'Tickets', href: '/tickets' },
]

const isActive = (href: string) => {
  if (href === '/appointments') {
    return route.path === '/appointments' || route.path === '/appointments/book'
  }
  if (href === '/tickets') {
    return route.path === '/' || route.path === '/tickets'
  }
  return route.path === href
}
</script>
