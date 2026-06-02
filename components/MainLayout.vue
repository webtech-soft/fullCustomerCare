<template>
  <div class="flex h-dvh min-h-0 overflow-hidden bg-brand-shell">
    <PlaceholderSidebar />
    <div
      v-if="mobileSidebarOpen"
      class="fixed inset-0 z-40 bg-black/50 lg:hidden"
      aria-hidden="true"
      @click="setMobileSidebarOpen(false)"
    />
    <!-- Main Content -->
    <div class="flex flex-1 flex-col overflow-hidden min-w-0">
      <!-- Top Navigation -->
      <TopNav />

      <!-- Page Content -->
      <main class="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { provideMobileSidebar } from '@/composables/useMobileSidebar'
import PlaceholderSidebar from './PlaceholderSidebar.vue'
import TopNav from './TopNav.vue'

const { mobileSidebarOpen, setMobileSidebarOpen } = provideMobileSidebar()
</script>

