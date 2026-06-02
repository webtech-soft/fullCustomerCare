<template>
  <div class="grid grid-cols-7 border-t border-l">
    <div v-for="day in dayHeaders" :key="day" class="border-r border-b bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
      {{ day }}
    </div>
    <div
      v-for="day in days"
      :key="day.key"
      class="min-h-28 border-r border-b p-1"
      :class="day.isCurrentMonth ? 'bg-white' : 'bg-slate-50/70'"
      @click="$emit('select-date', day.date)"
    >
      <div class="mb-1 text-xs" :class="day.isToday ? 'font-semibold text-brand-accent' : 'text-slate-600'">
        {{ day.label }}
      </div>
      <div class="space-y-1">
        <CalendarEventChip
          v-for="record in day.visible"
          :key="record.id"
          :record="record"
          @open="$emit('open', $event)"
        />
        <button
          v-if="day.remaining > 0"
          type="button"
          class="w-full rounded bg-slate-100 px-2 py-1 text-left text-xs text-slate-600 hover:bg-slate-200"
          @click.stop="$emit('show-more', day.date)"
        >
          + {{ day.remaining }} more
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AppointmentRecord } from '@/types/appointment'
import { startOfMonthGrid } from '@/lib/appointments/time'
import CalendarEventChip from './CalendarEventChip.vue'

const props = defineProps<{ selectedDate: string; records: AppointmentRecord[] }>()
defineEmits<{
  (e: 'open', id: string): void
  (e: 'select-date', date: string): void
  (e: 'show-more', date: string): void
}>()

const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const days = computed(() => {
  const target = new Date(`${props.selectedDate}T00:00:00`)
  const start = startOfMonthGrid(target)
  const today = new Date().toISOString().slice(0, 10)
  const rows = 6 * 7

  return Array.from({ length: rows }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const dateKey = date.toISOString().slice(0, 10)
    const dayRecords = props.records
      .filter((record) => record.requestedDate === dateKey)

    return {
      key: `${dateKey}-${index}`,
      date: dateKey,
      label: date.getDate(),
      isCurrentMonth: date.getMonth() === target.getMonth(),
      isToday: dateKey === today,
      visible: dayRecords.slice(0, 3),
      remaining: Math.max(dayRecords.length - 3, 0),
    }
  })
})
</script>
