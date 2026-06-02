<template>
  <div
    data-onboarding="ticket-style-selector"
    class="flex w-full sm:w-auto items-center gap-0 border rounded-md border-border overflow-hidden h-9 p-0.5 bg-muted"
  >
    <button
      v-for="style in STYLE_OPTIONS"
      :key="style.value"
      type="button"
      @click="selectStyle(style.value)"
      :class="[
        'flex flex-1 sm:flex-initial items-center justify-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors min-h-[44px] sm:min-h-[32px]',
        modelValue === style.value
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-background/60 dark:hover:bg-accent/40'
      ]"
    >
      <component :is="style.icon" :size="16" weight="regular" />
      <span class="hidden sm:inline">{{ style.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { markRaw } from 'vue'
import { PhSquaresFour, PhTable, PhChartLine } from '@phosphor-icons/vue'
import type { TicketStyle } from '@/types/ticket'

interface Props {
  modelValue: TicketStyle
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [style: TicketStyle]
}>()

const STYLE_OPTIONS = [
  { value: 'table' as TicketStyle, label: 'Table', icon: markRaw(PhTable) },
  { value: 'card' as TicketStyle, label: 'Cards', icon: markRaw(PhSquaresFour) },
  { value: 'progress' as TicketStyle, label: 'Progress', icon: markRaw(PhChartLine) },
]

function selectStyle(style: TicketStyle) {
  emit('update:modelValue', style)
}
</script>
