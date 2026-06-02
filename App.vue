<template>
  <MainLayout v-if="showMainLayout">
    <router-view />
  </MainLayout>
  <router-view v-else />
  <AnchoredUserDialogHost />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MainLayout from './components/MainLayout.vue'
import AnchoredUserDialogHost from './components/ui/AnchoredUserDialogHost.vue'

const route = useRoute()

// Don't show main layout (navigation) for customer invoice view
const showMainLayout = computed(() => {
  // Hide navigation for customer view routes
  return !route.path.startsWith('/view/')
    && route.path !== '/cv'
    && route.path !== '/appointments/reschedule'
    && route.path !== '/appointments/widget'
    && route.path !== '/widget'
})
</script>

