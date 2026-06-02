<template>
  <Teleport to="body" v-if="modelValue">
    <!-- Above TicketActionsDrawer (z-[151]) so modals work inside embedded customer invoice -->
    <div class="fixed inset-0 z-[200] flex items-center justify-center">
      <div
        class="fixed inset-0 bg-black/50"
        @click="onBackdropClick"
      />
      <slot />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { watch, onUnmounted } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** When false, clicking the scrim does not close the dialog. */
    closeOnBackdrop?: boolean
  }>(),
  { closeOnBackdrop: true }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function onBackdropClick() {
  if (props.closeOnBackdrop) {
    emit('update:modelValue', false)
  }
}

// Reference counter to track multiple dialogs (shared across all instances)
let dialogCount = 0
let originalOverflow: string | null = null

const lockScroll = () => {
  if (dialogCount === 0) {
    // Store original overflow value only on first lock
    originalOverflow = document.body.style.overflow || ''
    document.body.style.overflow = 'hidden'
  }
  dialogCount++
}

const unlockScroll = () => {
  dialogCount--
  if (dialogCount <= 0) {
    dialogCount = 0
    // Restore original overflow value
    if (originalOverflow !== null) {
      document.body.style.overflow = originalOverflow
      originalOverflow = null
    } else {
      document.body.style.overflow = ''
    }
  }
}

watch(() => props.modelValue, (open) => {
  if (open) {
    lockScroll()
  } else {
    unlockScroll()
  }
}, { immediate: true })

// Ensure scroll is unlocked on unmount
onUnmounted(() => {
  if (props.modelValue) {
    unlockScroll()
  }
})

// Safety: Restore scroll on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (dialogCount > 0) {
      dialogCount = 0
      if (originalOverflow !== null) {
        document.body.style.overflow = originalOverflow
        originalOverflow = null
      } else {
        document.body.style.overflow = ''
      }
    }
  })
}
</script>

