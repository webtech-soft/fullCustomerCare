<template>
  <div class="relative" ref="containerRef">
    <button
      type="button"
      class="flex h-9 min-w-[150px] items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
      :aria-expanded="isOpen ? 'true' : 'false'"
      @click="toggleOpen"
    >
      <span class="flex items-center gap-2">
        <span>Filters</span>
        <span
          v-if="activeFilterCount > 0"
          class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-accent px-1 text-xs font-semibold text-white"
        >
          {{ activeFilterCount }}
        </span>
      </span>
      <span class="text-xs text-slate-500">{{ isOpen ? '▲' : '▼' }}</span>
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="dropdownRef"
        class="fixed z-[90] w-[min(42rem,95vw)] rounded-md border border-border bg-card text-card-foreground shadow-lg"
        :style="dropdownStyle"
      >
        <div class="max-h-[70vh] overflow-y-auto p-4">
          <div class="mb-4">
            <label class="text-sm">
              <span class="mb-1 block text-xs font-medium text-muted-foreground">Sort By</span>
              <select
                :value="draftFilters.sortBy"
                class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                @change="updateDraft('sortBy', ($event.target as HTMLSelectElement).value as AppointmentFilters['sortBy'])"
              >
                <option v-for="option in sortOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </label>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <label class="text-sm">
              <span class="mb-1 block text-xs font-medium text-muted-foreground">From</span>
              <input
                :value="draftFilters.dateFrom || ''"
                type="date"
                class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                @input="updateDraft('dateFrom', ($event.target as HTMLInputElement).value || undefined)"
              />
            </label>
            <label class="text-sm">
              <span class="mb-1 block text-xs font-medium text-muted-foreground">To</span>
              <input
                :value="draftFilters.dateTo || ''"
                type="date"
                class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                @input="updateDraft('dateTo', ($event.target as HTMLInputElement).value || undefined)"
              />
            </label>
            <label class="text-sm">
              <span class="mb-1 block text-xs font-medium text-muted-foreground">Record Type</span>
              <select
                class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                @change="toggleRecordType(($event.target as HTMLSelectElement).value)"
              >
                <option value="">Add type filter</option>
                <option v-for="type in recordTypeOptions" :key="type" :value="type">{{ recordTypeLabel(type) }}</option>
              </select>
            </label>
            <label class="text-sm">
              <span class="mb-1 block text-xs font-medium text-muted-foreground">Status</span>
              <select
                class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                @change="toggleStatus(($event.target as HTMLSelectElement).value)"
              >
                <option value="">Add status filter</option>
                <option v-for="status in statusOptions" :key="status" :value="status">{{ statusLabel(status) }}</option>
              </select>
            </label>
          </div>

          <div class="mt-4 flex flex-wrap items-center gap-2">
            <span
              v-for="chip in chips"
              :key="chip.key"
              class="inline-flex items-center rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-700"
            >
              {{ chip.label }}
              <button class="ml-2 text-slate-600 hover:text-slate-900" @click="chip.remove">x</button>
            </span>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 border-t border-border bg-card px-4 py-3">
          <button type="button" class="h-9 rounded-md border border-input px-3 text-sm hover:bg-accent" @click="clearAll">
            Clear
          </button>
          <button type="button" class="h-9 rounded-md bg-brand-accent px-3 text-sm font-medium text-white hover:opacity-90" @click="applyFilters">
            Apply
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { AppointmentFilters, AppointmentRecordType, AppointmentStatus } from '@/types/appointment'
import { clampPopoverLeft } from '@/lib/popover-position'

const props = defineProps<{ filters: AppointmentFilters }>()
const emit = defineEmits<{
  (e: 'update:filters', value: AppointmentFilters): void
  (e: 'clear'): void
}>()

const recordTypeOptions: AppointmentRecordType[] = ['quick_note', 'schedule_note', 'booked_unconfirmed', 'confirmed']
const statusOptions: AppointmentStatus[] = ['confirmed', 'unconfirmed']
const sortOptions: Array<{ value: AppointmentFilters['sortBy']; label: string }> = [
  { value: 'date_time_asc', label: 'Date/Time (earliest first)' },
  { value: 'date_time_desc', label: 'Date/Time (latest first)' },
  { value: 'customer_asc', label: 'Customer (A-Z)' },
  { value: 'customer_desc', label: 'Customer (Z-A)' },
  { value: 'status_confirmed_first', label: 'Status (confirmed first)' },
  { value: 'status_unconfirmed_first', label: 'Status (unconfirmed first)' },
]

const containerRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const dropdownStyle = ref<{ top: string; left: string }>({
  top: '0px',
  left: '0px',
})
const draftFilters = ref<AppointmentFilters>({ ...props.filters })

watch(
  () => props.filters,
  (next) => {
    if (!isOpen.value) {
      draftFilters.value = { ...next }
    }
  },
  { deep: true }
)

const activeFilterCount = computed(() => {
  let count = 0
  if (props.filters.dateFrom) count++
  if (props.filters.dateTo) count++
  if (props.filters.recordTypes.length) count++
  if (props.filters.statuses.length) count++
  if (props.filters.sortBy !== 'date_time_asc') count++
  return count
})

const updateDraft = <K extends keyof AppointmentFilters>(key: K, value: AppointmentFilters[K]) => {
  draftFilters.value = { ...draftFilters.value, [key]: value }
}

const toggleRecordType = (value: string) => {
  if (!value) return
  const asType = value as AppointmentRecordType
  const next = draftFilters.value.recordTypes.includes(asType)
    ? draftFilters.value.recordTypes
    : [...draftFilters.value.recordTypes, asType]
  updateDraft('recordTypes', next)
}

const toggleStatus = (value: string) => {
  if (!value) return
  const asStatus = value as AppointmentStatus
  const next = draftFilters.value.statuses.includes(asStatus)
    ? draftFilters.value.statuses
    : [...draftFilters.value.statuses, asStatus]
  updateDraft('statuses', next)
}

const chips = computed(() => {
  const list: Array<{ key: string; label: string; remove: () => void }> = []
  if (draftFilters.value.dateFrom) {
    list.push({
      key: 'from',
      label: `From ${draftFilters.value.dateFrom}`,
      remove: () => updateDraft('dateFrom', undefined),
    })
  }
  if (draftFilters.value.dateTo) {
    list.push({
      key: 'to',
      label: `To ${draftFilters.value.dateTo}`,
      remove: () => updateDraft('dateTo', undefined),
    })
  }
  if (draftFilters.value.sortBy !== 'date_time_asc') {
    const sortLabel = sortOptions.find((option) => option.value === draftFilters.value.sortBy)?.label || 'Custom sort'
    list.push({
      key: 'sort',
      label: sortLabel,
      remove: () => updateDraft('sortBy', 'date_time_asc'),
    })
  }
  draftFilters.value.recordTypes.forEach((type) =>
    list.push({
      key: `t-${type}`,
      label: recordTypeLabel(type),
      remove: () => updateDraft('recordTypes', draftFilters.value.recordTypes.filter((item) => item !== type)),
    })
  )
  draftFilters.value.statuses.forEach((status) =>
    list.push({
      key: `s-${status}`,
      label: statusLabel(status),
      remove: () => updateDraft('statuses', draftFilters.value.statuses.filter((item) => item !== status)),
    })
  )
  return list
})

const recordTypeLabel = (type: AppointmentRecordType): string => {
  switch (type) {
    case 'quick_note':
      return 'Quick Note'
    case 'schedule_note':
      return 'Schedule Note'
    case 'booked_unconfirmed':
      return 'Booked (Unconfirmed)'
    case 'confirmed':
      return 'Confirmed Appointment'
    default:
      return type
  }
}

const statusLabel = (status: AppointmentStatus): string => (status === 'confirmed' ? 'Confirmed' : 'Unconfirmed')

const applyFilters = () => {
  emit('update:filters', { ...draftFilters.value })
  isOpen.value = false
}

const clearAll = () => {
  draftFilters.value = {
    ...draftFilters.value,
    dateFrom: undefined,
    dateTo: undefined,
    recordTypes: [],
    statuses: [],
    sortBy: 'date_time_asc',
  }
  emit('clear')
  emit('update:filters', { ...draftFilters.value })
}

const updateDropdownPosition = () => {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const estimatedWidth = dropdownRef.value?.getBoundingClientRect().width ?? Math.min(672, window.innerWidth * 0.95)
  dropdownStyle.value = {
    top: `${rect.bottom + 8}px`,
    left: `${clampPopoverLeft(rect.left, estimatedWidth)}px`,
  }
}

const toggleOpen = async () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    draftFilters.value = { ...props.filters }
    await nextTick()
    updateDropdownPosition()
  }
}

const handlePointerDown = (event: MouseEvent) => {
  if (!isOpen.value) return
  const target = event.target as Node | null
  if (!target) return
  if (containerRef.value?.contains(target) || dropdownRef.value?.contains(target)) return
  isOpen.value = false
}

const handleResize = () => {
  if (!isOpen.value) return
  updateDropdownPosition()
}

onMounted(() => {
  document.addEventListener('mousedown', handlePointerDown)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handlePointerDown)
  window.removeEventListener('resize', handleResize)
})
</script>
