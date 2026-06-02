<template>
  <div class="flex flex-wrap items-center gap-3">
    <!-- Date Range -->
    <div class="relative" ref="dateRangeRef">
      <select
        :value="filters.dateRange"
        @change="handleDateRangeChange(($event.target as HTMLSelectElement).value)"
        class="flex h-11 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <option v-for="option in DATE_RANGE_OPTIONS" :key="option" :value="option">
          {{ option }}
        </option>
      </select>
    </div>

    <!-- Custom Date Range Popover -->
    <Teleport to="body">
      <div
        v-if="showCustomDatePopover"
        ref="customDatePopoverRef"
        class="fixed z-[100] w-[calc(100vw-2rem)] sm:w-80 max-w-sm rounded-md border border-border bg-popover p-4 shadow-lg text-popover-foreground"
        :style="{
          top: `${customDatePopoverPosition.top}px`,
          left: `${customDatePopoverPosition.left}px`,
        }"
      >
        <div class="space-y-4">
          <div class="text-sm font-medium text-foreground">Custom Date Range</div>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-muted-foreground mb-1">From Date</label>
              <input
                type="date"
                :value="customFromDateInput"
                @input="(e) => customFromDateInput = (e.target as HTMLInputElement).value"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-muted-foreground mb-1">To Date</label>
              <input
                type="date"
                :value="customToDateInput"
                @input="(e) => customToDateInput = (e.target as HTMLInputElement).value"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
          <div class="flex gap-2 justify-end">
            <Button variant="outline" size="sm" @click="cancelCustomDateRange">
              Cancel
            </Button>
            <Button variant="brand" size="sm" @click="applyCustomDateRange">
              Apply
            </Button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Document type picker (Quote, WO, Batch, Inv) -->
    <TicketTypePicker :filters="filters" @update:filters="$emit('update:filters', $event)" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Button from '@/components/ui/Button.vue'
import TicketTypePicker from '@/components/tickets/TicketTypePicker.vue'
import type { TicketFilters } from '@/types/ticket'
import { positionDateRangePopover } from '@/lib/popover-position'

const props = defineProps<{
  filters: TicketFilters
}>()

const emit = defineEmits<{
  'update:filters': [filters: TicketFilters]
}>()

const DATE_RANGE_OPTIONS = [
  'Today',
  'Yesterday',
  'Tomorrow',
  'This Week',
  'Last Week',
  'This Month',
  'Last Month',
  'This Quarter',
  'Last Quarter',
  'This Year',
  'Last Year',
  'Custom Date Range'
]

const dateRangeRef = ref<HTMLElement | null>(null)
const customDatePopoverRef = ref<HTMLElement | null>(null)
const showCustomDatePopover = ref(false)
const customDatePopoverPosition = ref({ top: 0, left: 0 })
const customFromDateInput = ref('')
const customToDateInput = ref('')
const previousDateRange = ref('')

function handleFilterChange(key: keyof TicketFilters, value: any) {
  emit('update:filters', { ...props.filters, [key]: value })
}

function handleDateRangeChange(value: string) {
  if (value === 'Custom Date Range') {
    previousDateRange.value = props.filters.dateRange
    showCustomDatePopover.value = true
    updatePopoverPosition()

    if (props.filters.customFromDate) {
      const parts = props.filters.customFromDate.split('/')
      if (parts.length === 3) {
        customFromDateInput.value = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
      }
    }
    if (props.filters.customToDate) {
      const parts = props.filters.customToDate.split('/')
      if (parts.length === 3) {
        customToDateInput.value = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
      }
    }
  } else {
    handleFilterChange('dateRange', value)
  }
}

function updatePopoverPosition() {
  if (dateRangeRef.value) {
    const rect = dateRangeRef.value.getBoundingClientRect()
    customDatePopoverPosition.value = positionDateRangePopover(rect)
  }
}

function applyCustomDateRange() {
  if (customFromDateInput.value && customToDateInput.value) {
    const fromParts = customFromDateInput.value.split('-')
    const toParts = customToDateInput.value.split('-')

    const customFromDate = `${fromParts[1]}/${fromParts[2]}/${fromParts[0]}`
    const customToDate = `${toParts[1]}/${toParts[2]}/${toParts[0]}`

    emit('update:filters', {
      ...props.filters,
      dateRange: 'Custom Date Range',
      customFromDate,
      customToDate
    })
  }
  showCustomDatePopover.value = false
}

function cancelCustomDateRange() {
  showCustomDatePopover.value = false
  if (props.filters.dateRange === 'Custom Date Range' && previousDateRange.value) {
    handleFilterChange('dateRange', previousDateRange.value)
  }
}

onMounted(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (!showCustomDatePopover.value) return

    if (dateRangeRef.value && !dateRangeRef.value.contains(event.target as Node) &&
        customDatePopoverRef.value && !customDatePopoverRef.value.contains(event.target as Node)) {
      cancelCustomDateRange()
    }
  }

  document.addEventListener('mousedown', handleClickOutside)

  onUnmounted(() => {
    document.removeEventListener('mousedown', handleClickOutside)
  })
})
</script>
