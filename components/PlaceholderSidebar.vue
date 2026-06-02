<template>
  <aside
    class="flex shrink-0 flex-col bg-slate-800 transition-transform duration-200 lg:transition-[width]"
    :class="asideClasses"
    aria-label="Sidebar placeholder"
  >
    <!-- Toggle: hamburger (mobile: close drawer; lg+: narrow/wide) -->
    <button
      type="button"
      class="flex h-12 w-full items-center justify-center border-b border-slate-700 text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-500"
      aria-label="Toggle sidebar"
      @click="onHamburgerClick"
    >
      <span class="flex flex-col gap-1">
        <span class="block h-0.5 w-5 rounded bg-current" />
        <span class="block h-0.5 w-5 rounded bg-current" />
        <span class="block h-0.5 w-5 rounded bg-current" />
      </span>
    </button>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useMobileSidebar } from '@/composables/useMobileSidebar'

const { mobileSidebarOpen, toggleMobileSidebar } = useMobileSidebar()

const collapsed = ref(true)

/** Tailwind lg breakpoint — mobile drawer uses max-width 1023px */
const isMobileViewport = ref(false)

function updateMobileViewport() {
  isMobileViewport.value = window.matchMedia('(max-width: 1023px)').matches
}

onMounted(() => {
  updateMobileViewport()
  window.addEventListener('resize', updateMobileViewport)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateMobileViewport)
})

function onHamburgerClick() {
  if (isMobileViewport.value) {
    toggleMobileSidebar()
  } else {
    collapsed.value = !collapsed.value
  }
}

const asideClasses = computed(() => {
  const widthLg = collapsed.value ? 'lg:w-[70px]' : 'lg:w-[148px]'
  const mobileTransform = mobileSidebarOpen.value
    ? 'translate-x-0'
    : '-translate-x-full'
  return [
    'fixed top-0 left-0 z-50 h-dvh w-[148px] lg:relative lg:top-auto lg:h-auto lg:min-h-0 lg:translate-x-0 lg:inset-auto lg:z-auto',
    mobileTransform,
    widthLg,
  ]
})
</script>
