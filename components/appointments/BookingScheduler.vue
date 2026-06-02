<template>
  <AppointmentsPage
    :mode="mode"
    :show-page-header="showPageHeader"
    :show-close-button="showCloseButton"
    @close="$emit('close')"
    @completed="$emit('completed', $event)"
    @height-change="$emit('height-change', $event)"
  />
</template>

<script setup lang="ts">
import AppointmentsPage from '@/pages/AppointmentsPage.vue'

withDefaults(
  defineProps<{
    mode?: 'app' | 'embed'
    showPageHeader?: boolean
    showCloseButton?: boolean
  }>(),
  {
    mode: 'embed',
    showPageHeader: true,
    showCloseButton: false,
  }
)

defineEmits<{
  (e: 'close'): void
  (e: 'completed', value: { mode: 'app' | 'embed' }): void
  (e: 'height-change', value: { height: number }): void
}>()
</script>
