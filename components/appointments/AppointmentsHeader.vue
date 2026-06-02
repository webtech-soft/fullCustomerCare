<template>
  <div class="border-b border-border bg-card">
    <div class="mx-auto flex w-full max-w-[2130px] flex-wrap items-center gap-3 px-3 py-3 sm:px-4 lg:px-8">
      <h1 class="pl-[15px] text-xl font-bold text-brand-accent sm:text-2xl">Appointments</h1>

      <AppointmentsFilterBar :filters="filters" @update:filters="$emit('update:filters', $event)" @clear="$emit('clear-filters')" />

      <div class="flex rounded-md border border-slate-200 p-1">
        <button
          v-for="option in viewOptions"
          :key="option.id"
          type="button"
          class="rounded px-3 py-1.5 text-sm"
          :class="option.id === activeView ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'"
          @click="$emit('update:activeView', option.id)"
        >
          {{ option.label }}
        </button>
      </div>

      <div v-if="activeView === 'calendar'" class="flex rounded-md border border-slate-200 p-1">
        <button
          v-for="option in calendarOptions"
          :key="option.id"
          type="button"
          class="rounded px-3 py-1.5 text-sm"
          :class="option.id === calendarView ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'"
          @click="$emit('update:calendarView', option.id)"
        >
          {{ option.label }}
        </button>
      </div>

      <input
        :value="date"
        type="date"
        class="h-9 rounded-md border border-slate-200 px-2 text-sm"
        @input="$emit('update:date', ($event.target as HTMLInputElement).value)"
      />
      <button
        type="button"
        class="h-9 rounded-md border border-slate-200 px-3 text-sm hover:bg-slate-100"
        @click="$emit('today')"
      >
        Today
      </button>

      <button
        type="button"
        class="h-9 rounded-md border border-slate-200 px-3 text-sm hover:bg-slate-100"
        @click="handleRefreshClick"
      >
        Refresh
      </button>

      <div class="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:min-w-[300px] sm:max-w-md">
        <input
          :value="searchDraft"
          type="text"
          class="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
          placeholder="Search customer, vehicle, bay, date"
          @input="$emit('update:searchDraft', ($event.target as HTMLInputElement).value)"
          @keyup.enter="$emit('submit-search')"
        />
        <Button variant="ink" class="h-11 min-h-[44px] min-w-[100px] shrink-0" @click="$emit('submit-search')">
          <PhMagnifyingGlass :size="16" weight="regular" class="mr-2" />
          Search
        </Button>
      </div>

      <div ref="addMenuContainerRef" class="relative ml-auto">
        <button
          type="button"
          class="h-10 rounded-md bg-brand-accent px-3 text-sm font-medium text-white hover:opacity-90"
          :aria-expanded="isAddMenuOpen ? 'true' : 'false'"
          aria-haspopup="menu"
          @click="toggleAddMenu"
        >
          + Create
        </button>

        <div
          v-if="isAddMenuOpen"
          class="absolute right-0 top-full z-40 mt-1 min-w-[200px] rounded-md border border-slate-200 bg-white p-1 shadow-lg"
          role="menu"
          aria-label="Add menu"
        >
          <button
            type="button"
            class="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
            role="menuitem"
            @click="openScheduler"
          >
            Open Appointment Scheduler
          </button>
          <button
            type="button"
            class="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
            role="menuitem"
            @click="selectCreateIntent('appointment')"
          >
            New Appointment
          </button>
          <button
            type="button"
            class="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
            role="menuitem"
            @click="selectCreateIntent('quick_note')"
          >
            New Quick Note
          </button>
          <button
            type="button"
            class="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
            role="menuitem"
            @click="selectCreateIntent('schedule_note')"
          >
            New Schedule Note
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { AppointmentFilters } from '@/types/appointment'
import AppointmentsFilterBar from '@/components/appointments/AppointmentsFilterBar.vue'
import Button from '@/components/ui/Button.vue'
import { PhMagnifyingGlass } from '@phosphor-icons/vue'

type ViewMode = 'calendar' | 'bay' | 'list'
type CalendarMode = 'month' | 'week' | 'day'
type CreateIntent = 'appointment' | 'quick_note' | 'schedule_note'

defineProps<{
  activeView: ViewMode
  calendarView: CalendarMode
  date: string
  searchDraft: string
  filters: AppointmentFilters
}>()

const emit = defineEmits<{
  (e: 'update:activeView', value: ViewMode): void
  (e: 'update:calendarView', value: CalendarMode): void
  (e: 'update:date', value: string): void
  (e: 'update:searchDraft', value: string): void
  (e: 'submit-search'): void
  (e: 'update:filters', value: AppointmentFilters): void
  (e: 'clear-filters'): void
  (e: 'today'): void
  (e: 'refresh'): void
  (e: 'create', value: CreateIntent): void
  (e: 'open-scheduler'): void
}>()

const viewOptions: Array<{ id: ViewMode; label: string }> = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'bay', label: 'Bay' },
  { id: 'list', label: 'List' },
]

const calendarOptions: Array<{ id: CalendarMode; label: string }> = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
]

const addMenuContainerRef = ref<HTMLElement | null>(null)
const isAddMenuOpen = ref(false)

const closeAddMenu = () => {
  isAddMenuOpen.value = false
}

const toggleAddMenu = () => {
  isAddMenuOpen.value = !isAddMenuOpen.value
}

const selectCreateIntent = (intent: CreateIntent) => {
  emit('create', intent)
  closeAddMenu()
}

const openScheduler = () => {
  emit('open-scheduler')
  closeAddMenu()
}

const handleRefreshClick = () => {
  emit('refresh')
  window.location.reload()
}

const handlePointerDown = (event: MouseEvent) => {
  if (!isAddMenuOpen.value || !addMenuContainerRef.value) return
  const target = event.target as Node | null
  if (!target) return
  if (!addMenuContainerRef.value.contains(target)) {
    closeAddMenu()
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isAddMenuOpen.value) {
    event.preventDefault()
    closeAddMenu()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handlePointerDown)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handlePointerDown)
  document.removeEventListener('keydown', handleKeydown)
})
</script>
