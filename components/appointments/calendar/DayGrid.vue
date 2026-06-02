<template>
  <div class="h-full min-h-0 overflow-x-auto rounded-md border bg-white">
    <div class="flex h-full min-h-[320px] min-h-0 w-max min-w-full flex-col">
      <div class="shrink-0 grid border-b-0 bg-white" :style="gridColumnsStyle">
        <div class="border-b border-r bg-slate-50 p-2 text-xs font-medium text-slate-600">Time</div>
        <div
          class="border-b p-2 text-xs font-medium"
          :class="isSelectedDateToday ? 'bg-slate-100 text-slate-900 font-semibold' : 'bg-slate-50 text-slate-600'"
        >
          {{ headerLabel }}
        </div>

        <div class="border-r border-b bg-slate-50 px-2 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Day notes
        </div>
        <div
          class="border-b px-2 py-2 text-xs font-medium hover:bg-slate-100"
          :class="isSelectedDateToday ? 'bg-slate-100 text-slate-900 font-semibold' : 'bg-slate-50 text-slate-600'"
          @click="emitCreateNote($event)"
        >
          <button
            v-for="record in bayBlockersForDayNotes"
            :key="`day-note-${record.id}`"
            type="button"
            class="mb-1 block w-full truncate rounded px-1 py-0.5 text-left text-[11px] font-medium text-slate-700 hover:bg-slate-200"
            @click.stop="$emit('open', record.id)"
          >
            {{ dayNoteLabel(record) }}
          </button>
        </div>
      </div>

      <div ref="bodyScrollEl" class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div class="relative flex min-w-[720px]" :style="{ minHeight: `${columnHeightPx}px` }">
          <div
            class="sticky left-0 z-20 flex w-20 shrink-0 flex-col border-r bg-white"
            :style="{ minHeight: `${columnHeightPx}px` }"
          >
            <div
              v-for="slot in slots"
              :key="slot.key"
              class="relative h-14 shrink-0 border-b px-2 py-2 text-xs text-slate-500"
              :class="isCurrentSlot(slot.time) ? 'z-40' : 'z-10'"
            >
              {{ slot.label }}
              <div
                v-if="isSelectedDateToday && isCurrentSlot(slot.time) && nowLineTopPx !== null"
                class="pointer-events-none absolute inset-x-0 z-30 border-t-2 border-red-500"
                :style="{ top: `${nowLineOffsetInSlotPx}px` }"
              >
                <span class="absolute -top-3 right-1 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {{ currentTimeLabel }}
                </span>
              </div>
            </div>
          </div>

          <div
            class="relative min-w-0 flex-1 border-r p-1"
            :class="isSelectedDateToday ? 'bg-slate-100/70' : ''"
            :style="{ minHeight: `${columnHeightPx}px` }"
          >
            <div
              v-if="isSelectedDateToday && nowLineTopPx !== null"
              class="pointer-events-none absolute inset-x-0 z-30 border-t-2 border-red-500"
              :style="{ top: `${nowLineTopPx}px` }"
            >
              <span
                class="absolute -left-0.5 -top-[5px] h-0 w-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-red-500"
              ></span>
            </div>

            <div class="absolute inset-0 flex flex-col">
              <div
                v-for="slot in slots"
                :key="slot.key"
                class="h-14 shrink-0 border-b border-dashed border-slate-200"
                :class="dayCellBg(slot.time)"
                @dragover.prevent
                @drop="$emit('drop', { date: selectedDate, time: slot.time })"
                @click="emitCreateAt($event, slot.time)"
              />
            </div>

            <div class="pointer-events-none absolute inset-0 p-1">
              <div
                v-for="overlay in overlayEntriesForDayColumn"
                :key="overlay.id"
                class="absolute box-border overflow-hidden rounded border border-orange-300 bg-orange-100/85 px-2 py-1 text-left text-[11px] text-orange-900 shadow-sm"
                :style="columnEventStyle(overlay, overlay.laneIndex, overlay.laneCount, 12)"
              >
                <div class="line-clamp-1 font-medium leading-tight">
                  {{ overlay.kind === 'proposed_preview' ? 'Selected option' : 'Proposed to customer' }}
                </div>
                <div v-if="overlay.customerName" class="line-clamp-1 mt-0.5 text-[11px] leading-tight">
                  {{ overlay.customerName }}
                </div>
                <div v-if="overlay.vehicleLabel" class="line-clamp-1 text-[11px] leading-tight opacity-80">
                  {{ overlay.vehicleLabel }}
                </div>
              </div>

              <button
                v-for="entry in appointmentsForDayColumn"
                :key="entry.record.id"
                type="button"
                draggable="true"
                data-cell-interactive="true"
                class="pointer-events-auto absolute box-border flex flex-col overflow-hidden rounded border px-2 py-1 text-left text-xs shadow-sm"
                :class="eventClass(entry.record)"
                :style="columnEventStyle(entry.record, entry.laneIndex, entry.laneCount, 10)"
                @dragstart="$emit('drag-start', entry.record.id)"
                @click.stop="$emit('open', entry.record.id)"
              >
                <div class="line-clamp-2 break-words text-left font-medium leading-tight">{{ recordTitle(entry.record) }}</div>
                <div class="line-clamp-3 min-h-0 flex-1 break-words text-left text-[11px] leading-snug">
                  {{ secondaryLabel(entry.record) }}
                </div>
              </button>

              <button
                v-for="entry in calendarNotesForDayColumn"
                :key="entry.record.id"
                type="button"
                draggable="true"
                data-cell-interactive="true"
                class="pointer-events-auto absolute box-border flex flex-col overflow-hidden rounded border px-2 py-1 text-left text-xs shadow-sm"
                :class="scheduleNoteClass"
                :style="columnEventStyle(entry.record, entry.laneIndex, entry.laneCount, 50)"
                @dragstart="$emit('drag-start', entry.record.id)"
                @click.stop="$emit('open', entry.record.id)"
              >
                <div class="line-clamp-2 break-words text-left font-medium leading-tight">
                  {{ scheduleNoteTitle(entry.record) }}
                </div>
                <div class="line-clamp-2 break-words text-left text-[11px] leading-snug">
                  {{ entry.record.requestedTime }} - {{ endTime(entry.record) }}
                </div>
              </button>

            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import type { AppointmentRecord } from '@/types/appointment'
import { addMinutes, formatTimeLabel, toMinutes } from '@/lib/appointments/time'
import {
  absoluteBlockStyle,
  dayColumnHeightPx,
  nowLineTopFromGridStart,
  recordIntersectsVisibleGrid,
} from '@/lib/appointments/calendarColumnLayout'
import {
  GRID_END_HOUR,
  GRID_START_HOUR,
  isShopOpenSlot,
  scrollGridToShopOpenHour,
} from '@/lib/appointments/shopCalendar'
import { defaultLaneAssignment } from '@/lib/appointments/unifiedCalendarLanes'
import { computeLaneLayout, type LaneAssignment, type LayoutInterval } from '@/lib/appointments/overlapLayout'
import { formatAppointmentTicketNumber, getRecordDisplayTitle, getResolvedRecordColorToken } from '@/api/appointments'

const props = defineProps<{
  selectedDate: string
  records: AppointmentRecord[]
  overlaySlots?: Array<{
    key: string
    date: string
    time: string
    durationMinutes: number
    bayId?: string
    kind: 'proposed_preview' | 'proposed_sent'
    customerName?: string
    vehicleLabel?: string
  }>
}>()

const bodyScrollEl = ref<HTMLElement | null>(null)
const now = ref(new Date())
let nowTimer: ReturnType<typeof setInterval> | undefined

const emit = defineEmits<{
  (e: 'open', id: string): void
  (e: 'drag-start', id: string): void
  (e: 'drop', payload: { date: string; time: string }): void
  (e: 'create-at', payload: { date: string; baseTime: string; startTime: string; clientX: number; clientY: number }): void
  (e: 'create-note', payload: { date: string; clientX: number; clientY: number }): void
}>()
const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
const todayKey = computed(() => toDateKey(now.value))
const isSelectedDateToday = computed(() => props.selectedDate === todayKey.value)

const gridColumnsStyle = { gridTemplateColumns: '80px minmax(0, 1fr)' }

const SLOT_INSET_PX = 4
const SLOT_HEIGHT_PX = 56

const headerLabel = computed(() =>
  new Date(`${props.selectedDate}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
)

const slots = computed(() => {
  const list: Array<{ key: string; time: string; label: string }> = []
  for (let hour = GRID_START_HOUR; hour <= GRID_END_HOUR; hour += 1) {
    const time = `${hour.toString().padStart(2, '0')}:00`
    list.push({ key: `day-${time}`, time, label: formatTimeLabel(time) })
  }
  return list
})

const dayCellBg = (slotTime: string) => {
  if (!isShopOpenSlot(slotTime)) return 'bg-slate-200'
  return isSelectedDateToday.value ? 'bg-slate-100/70' : ''
}

const columnHeightPx = computed(() => dayColumnHeightPx())

const nowMinutes = computed(() => now.value.getHours() * 60 + now.value.getMinutes())
const nowSlotTime = computed(() => {
  const hour = Math.floor(nowMinutes.value / 60)
  return `${hour.toString().padStart(2, '0')}:00`
})
const isCurrentSlot = (slotTime: string) => slotTime === nowSlotTime.value

const nowLineTopPx = computed(() => {
  if (!isSelectedDateToday.value) return null
  return nowLineTopFromGridStart(nowMinutes.value)
})

const nowLineOffsetInSlotPx = computed(() =>
  Math.min(SLOT_HEIGHT_PX - 1, SLOT_INSET_PX + Math.round(((nowMinutes.value % 60) / 60) * SLOT_HEIGHT_PX))
)

const isAppointmentRecord = (record: AppointmentRecord) =>
  record.recordType === 'booked_unconfirmed' || record.recordType === 'confirmed'

const isBayBlocker = (record: AppointmentRecord) =>
  record.recordType === 'schedule_note' && record.scheduleBlockerType === 'bay_blocker'

const isCalendarScheduleNote = (record: AppointmentRecord) =>
  record.recordType === 'schedule_note' && !isBayBlocker(record)

const isDayColumnLaneRecord = (record: AppointmentRecord) =>
  record.recordType === 'confirmed' ||
  record.recordType === 'booked_unconfirmed' ||
  (record.recordType === 'schedule_note' && record.scheduleBlockerType !== 'bay_blocker')

const dayLaneMap = computed(() => {
  const intervals: LayoutInterval[] = []
  for (const record of props.records) {
    if (record.requestedDate !== props.selectedDate || !isDayColumnLaneRecord(record)) continue
    const start = toMinutes(record.requestedTime)
    const end = start + Math.max(0, record.requestedDuration)
    intervals.push({ id: record.id, start, end })
  }
  for (const slot of props.overlaySlots || []) {
    if (slot.date !== props.selectedDate) continue
    const start = toMinutes(slot.time)
    const end = start + Math.max(30, slot.durationMinutes || 30)
    intervals.push({ id: slot.key, start, end })
  }
  return computeLaneLayout(intervals)
})

const laneForRecord = (recordId: string): LaneAssignment =>
  dayLaneMap.value.get(recordId) ?? defaultLaneAssignment()

const laneForOverlay = (overlayId: string): LaneAssignment =>
  dayLaneMap.value.get(overlayId) ?? defaultLaneAssignment()

type LaneEntry = { record: AppointmentRecord; laneIndex: number; laneCount: number }
type PositionedBlock = Pick<AppointmentRecord, 'requestedDate' | 'requestedTime' | 'requestedDuration'>

const mapDayRecordsWithLanes = (pred: (r: AppointmentRecord) => boolean): LaneEntry[] =>
  props.records
    .filter(
      (r) => r.requestedDate === props.selectedDate && pred(r) && recordIntersectsVisibleGrid(r, props.selectedDate)
    )
    .map((record) => ({
      record,
      ...laneForRecord(record.id),
    }))

const appointmentsForDayColumn = computed(() =>
  mapDayRecordsWithLanes((r) => r.recordType !== 'schedule_note')
)

const calendarNotesForDayColumn = computed(() => mapDayRecordsWithLanes((r) => isCalendarScheduleNote(r)))

const overlayEntriesForDayColumn = computed(() =>
  (props.overlaySlots || [])
    .filter((slot) => {
      if (slot.date !== props.selectedDate) return false
      const start = toMinutes(slot.time)
      const end = start + Math.max(30, slot.durationMinutes || 30)
      return end > GRID_START_HOUR * 60 && start < (GRID_END_HOUR + 1) * 60
    })
    .map((slot) => ({
      id: slot.key,
      requestedDate: slot.date,
      requestedTime: slot.time,
      requestedDuration: Math.max(30, slot.durationMinutes || 30),
      kind: slot.kind,
      customerName: slot.customerName || '',
      vehicleLabel: slot.vehicleLabel || '',
      ...laneForOverlay(slot.key),
    }))
)

const columnEventStyle = (
  record: PositionedBlock,
  laneIndex: number,
  laneCount: number,
  zIndex: number
) => absoluteBlockStyle(record as AppointmentRecord, laneIndex, laneCount, zIndex, 0)

const vehicleLabel = (record: AppointmentRecord) =>
  [record.vehicle?.year, record.vehicle?.make, record.vehicle?.model].filter(Boolean).join(' ')

const recordTitle = (record: AppointmentRecord) => getRecordDisplayTitle(record)

const endTime = (record: AppointmentRecord) => addMinutes(record.requestedTime, record.requestedDuration)

const bayBlockersForDayNotes = computed(() =>
  props.records
    .filter((record) => record.requestedDate === props.selectedDate && isBayBlocker(record))
)

const dayNoteLabel = (record: AppointmentRecord) => {
  const bayLabel = record.bayName || record.bayId || 'Bay'
  return `${bayLabel} Blocker (${formatTimeLabel(record.requestedTime)} - ${formatTimeLabel(endTime(record))})`
}

const secondaryLabel = (record: AppointmentRecord) => {
  const timeRange = `${record.requestedTime} - ${endTime(record)}`
  if (!isAppointmentRecord(record)) return timeRange
  const vehicle = vehicleLabel(record)
  const ticket = formatAppointmentTicketNumber(record)
  const core = vehicle ? `${vehicle} · ${timeRange}` : timeRange
  return ticket ? `${core} · ${ticket}` : core
}

const eventClass = (record: AppointmentRecord) => {
  const base = getResolvedRecordColorToken(record)
  return record.recordType === 'booked_unconfirmed' ? `${base} border-dashed` : base
}
const scheduleNoteClass = getResolvedRecordColorToken({ recordType: 'schedule_note' })
const scheduleNoteTitle = (record: AppointmentRecord) =>
  (record.customerName || '').trim() || (record.note || '').trim() || 'Technician Unavailable'

const currentTimeLabel = computed(() =>
  formatTimeLabel(`${now.value.getHours().toString().padStart(2, '0')}:${now.value.getMinutes().toString().padStart(2, '0')}`)
)

const emitCreateAt = (event: MouseEvent, baseTime: string) => {
  const target = event.target as HTMLElement | null
  if (target?.closest('[data-cell-interactive="true"]')) return
  const currentTarget = event.currentTarget as HTMLElement | null
  if (!currentTarget) return
  const rect = currentTarget.getBoundingClientRect()
  const clickY = event.clientY - rect.top
  const startMinutes = clickY >= rect.height / 2 ? '30' : '00'
  const hour = baseTime.split(':')[0] || '00'
  emit('create-at', {
    date: props.selectedDate,
    baseTime,
    startTime: `${hour}:${startMinutes}`,
    clientX: event.clientX,
    clientY: event.clientY,
  })
}

const emitCreateNote = (event: MouseEvent) => {
  emit('create-note', {
    date: props.selectedDate,
    clientX: event.clientX,
    clientY: event.clientY,
  })
}

const runScrollToShopOpen = () => {
  nextTick(() => scrollGridToShopOpenHour(bodyScrollEl.value))
}

onMounted(() => {
  nowTimer = setInterval(() => {
    now.value = new Date()
  }, 30000)
  runScrollToShopOpen()
})

watch(
  () => props.selectedDate,
  () => {
    runScrollToShopOpen()
  }
)

onUnmounted(() => {
  if (!nowTimer) return
  clearInterval(nowTimer)
})
</script>
