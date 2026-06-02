<template>
  <div class="relative" ref="containerRef" :class="{ 'w-full': fullWidth }">
    <button
      type="button"
      @click="isOpen = !isOpen"
      :class="[
        'flex items-center gap-2 px-3 rounded-md border border-input bg-background text-sm font-medium text-foreground hover:bg-accent transition-colors',
        fullWidth ? 'h-10 w-full' : 'h-11 min-w-[120px]'
      ]"
    >
      <span class="truncate">{{ summaryLabel }}</span>
      <PhCaretDown :size="12" weight="bold" :class="['shrink-0 transition-transform', { 'rotate-180': isOpen }]" />
    </button>
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="dropdownRef"
        data-keep-filters-open="true"
        class="fixed z-[100] w-48 rounded-md border border-border bg-popover py-1 shadow-lg text-popover-foreground"
        :style="dropdownStyle"
      >
        <label class="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent cursor-pointer">
          <Checkbox :checked="filters.quote" @update:checked="(v) => toggle('quote', v)" />
          <span>Quote</span>
        </label>
        <label class="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent cursor-pointer">
          <Checkbox :checked="filters.workorder" @update:checked="(v) => toggle('workorder', v)" />
          <span>Workorder</span>
        </label>
        <label class="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent cursor-pointer">
          <Checkbox :checked="filters.batch" @update:checked="(v) => toggle('batch', v)" />
          <span>Batch</span>
        </label>
        <label class="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent cursor-pointer">
          <Checkbox :checked="filters.invoice" @update:checked="(v) => toggle('invoice', v)" />
          <span>Invoice</span>
        </label>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import Checkbox from '@/components/ui/Checkbox.vue'
import { PhCaretDown } from '@phosphor-icons/vue'
import type { TicketFilters } from '@/types/ticket'

const props = withDefaults(
  defineProps<{
    filters: TicketFilters
    /** When true, picker fills container width (e.g. in advanced filters grid). */
    fullWidth?: boolean
  }>(),
  { fullWidth: false }
)

const emit = defineEmits<{
  'update:filters': [filters: TicketFilters]
}>()

const containerRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const dropdownStyle = ref({ top: '0px', left: '0px' })

const summaryLabel = computed(() => {
  const parts: string[] = []
  if (props.filters.quote) parts.push('Quote')
  if (props.filters.workorder) parts.push('WO')
  if (props.filters.batch) parts.push('Batch')
  if (props.filters.invoice) parts.push('Inv')
  return parts.length > 0 ? parts.join(', ') : 'Types'
})

function toggle(key: 'quote' | 'workorder' | 'batch' | 'invoice', value: boolean) {
  let next = { ...props.filters, [key]: value }
  const any = next.quote || next.workorder || next.batch || next.invoice
  if (!any) {
    next = { ...next, workorder: true }
  }
  emit('update:filters', next)
}

function updatePosition() {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    dropdownStyle.value = { top: `${rect.bottom + 4}px`, left: `${rect.left}px` }
  }
}

watch(isOpen, (open) => {
  if (open) updatePosition()
})

onMounted(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (!isOpen.value) return
    if (containerRef.value?.contains(e.target as Node)) return
    if (dropdownRef.value?.contains(e.target as Node)) return
    isOpen.value = false
  }
  document.addEventListener('mousedown', handleClickOutside)
  onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside))
})
</script>
