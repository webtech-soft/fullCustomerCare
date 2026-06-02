<template>
  <div
    class="h-full min-h-0 rounded-md border bg-white"
    :class="props.shopHoursOnly ? 'overflow-x-hidden' : 'overflow-x-auto'"
  >
    <div
      class="flex h-full min-h-[320px] min-h-0 flex-col"
      :class="props.shopHoursOnly ? 'w-full min-w-0' : 'w-max min-w-full'"
    >
      <div class="shrink-0 grid border-b-0 bg-white" :style="{ gridTemplateColumns }">
        <div class="border-b border-r bg-slate-50 p-2 text-xs font-medium text-slate-600">Time</div>
        <button
          v-for="day in days"
          :key="day.date"
          type="button"
          class="border-b p-2 text-left text-xs font-medium"
          :class="day.isToday ? 'bg-slate-100 text-slate-900 font-semibold' : 'bg-slate-50 text-slate-600'"
          @click="$emit('select-date', day.date)"
        >
          {{ day.label }}
        </button>

        <div class="border-r border-b bg-slate-50 px-2 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Day notes
        </div>
        <div
          v-for="day in days"
          :key="`notes-${day.date}`"
          class="cursor-pointer border-r border-b bg-slate-50 px-2 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
          :class="day.isToday ? 'bg-slate-100 text-slate-900' : ''"
          @click="emitCreateNote($event, day.date)"
        >
          <button
            v-for="record in bayBlockersForDayNotes(day.date)"
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
        <div class="relative flex" :style="gridBodyStyle">
          <div
            class="sticky left-0 z-20 flex shrink-0 flex-col border-r border-b-0 bg-white"
            :style="{ minHeight: `${columnHeightPx}px`, width: `${timeColumnWidthPx}px` }"
          >
            <div
              v-for="slot in slots"
              :key="slot.key"
              class="relative h-14 shrink-0 border-b px-2 py-2 text-xs text-slate-500"
              :class="isCurrentSlot(slot.time) ? 'z-30' : 'z-10'"
            >
              {{ slot.label }}
            </div>
          </div>

          <div
            class="grid min-w-0 flex-1"
            :style="{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`, minHeight: `${columnHeightPx}px` }"
          >
            <div
              v-for="day in days"
              :key="day.date"
              class="relative border-r p-1"
              :class="day.isToday ? 'bg-slate-100/70' : ''"
              :style="{ minHeight: `${columnHeightPx}px` }"
            >
              <div
                v-if="day.isToday && nowLineTopPx !== null"
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
                  :class="dayCellBg(day, slot.time)"
                  @dragover.prevent
                  @drop="$emit('drop', { date: day.date, time: slot.time })"
                  @click="emitCreateAt($event, day.date, slot.time)"
                />
              </div>

              <div class="pointer-events-none absolute inset-0 p-1">
                <div
                  v-for="overlay in overlayEntriesForDayColumn(day.date)"
                  :key="overlay.id"
                  class="absolute box-border overflow-hidden rounded border px-2 py-1 text-left text-[11px] shadow-sm"
                  :class="
                    overlay.kind === 'proposed_selected'
                      ? 'pointer-events-auto cursor-pointer border-orange-700 bg-orange-600/90 text-white'
                      : overlay.kind === 'proposed_placeholder'
                        ? 'pointer-events-auto cursor-pointer border-orange-300 bg-orange-100/85 text-orange-900'
                        : 'pointer-events-none border-orange-300 bg-orange-100/85 text-orange-900'
                  "
                  :data-cell-interactive="overlay.kind === 'proposed_placeholder' || overlay.kind === 'proposed_selected'"
                  :style="columnEventStyle(overlay, day.date, overlay.laneIndex, overlay.laneCount, 12)"
                  @click.stop="emitOverlayPick($event, day.date, overlay)"
                >
                  <div class="line-clamp-1 font-medium leading-tight">
                    {{
                      overlay.kind === 'proposed_selected'
                        ? 'Selected option'
                        : overlay.kind === 'proposed_placeholder'
                          ? 'Suggested option'
                          : overlay.kind === 'proposed_preview'
                            ? 'Selected option'
                            : 'Proposed to customer'
                    }}
                  </div>
                  <div v-if="overlay.customerName" class="line-clamp-1 mt-0.5 text-[11px] leading-tight">
                    {{ overlay.customerName }}
                  </div>
                  <div v-if="overlay.vehicleLabel" class="line-clamp-1 text-[11px] leading-tight opacity-80">
                    {{ overlay.vehicleLabel }}
                  </div>
                </div>

                <button
                  v-for="entry in appointmentsForDayColumn(day.date)"
                  :key="entry.record.id"
                  type="button"
                  draggable="true"
                  data-cell-interactive="true"
                  class="pointer-events-auto absolute box-border flex flex-col overflow-hidden rounded border px-2 py-1 text-left text-xs shadow-sm"
                  :class="eventClass(entry.record)"
                  :style="columnEventStyle(entry.record, day.date, entry.laneIndex, entry.laneCount, 10)"
                  @dragstart="$emit('drag-start', entry.record.id)"
                  @click.stop="$emit('open', entry.record.id)"
                >
                  <div class="line-clamp-2 break-words text-left font-medium leading-tight">
                    {{ recordTitle(entry.record) }}
                  </div>
                  <div class="line-clamp-3 min-h-0 flex-1 break-words text-left text-[11px] leading-snug">
                    {{ secondaryLabel(entry.record) }}
                  </div>
                </button>

                <button
                  v-for="entry in calendarNotesForDayColumn(day.date)"
                  :key="entry.record.id"
                  type="button"
                  draggable="true"
                  data-cell-interactive="true"
                  class="pointer-events-auto absolute box-border flex flex-col overflow-hidden rounded border px-2 py-1 text-left text-xs shadow-sm"
                  :class="scheduleNoteClass"
                  :style="columnEventStyle(entry.record, day.date, entry.laneIndex, entry.laneCount, 50)"
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import type { AppointmentRecord } from '@/types/appointment'
import { addMinutes, formatTimeLabel, toMinutes } from '@/lib/appointments/time'
import {
  absoluteBlockStyle,
  nowLineTopFromGridStart,
} from '@/lib/appointments/calendarColumnLayout'
import {
  GRID_END_HOUR,
  GRID_START_HOUR,
  getShopOpenBounds,
  isShopOpenSlot,
  scrollGridToShopOpenHour,
  SLOT_HEIGHT_PX,
} from '@/lib/appointments/shopCalendar'
import { defaultLaneAssignment } from '@/lib/appointments/unifiedCalendarLanes'
import { computeLaneLayout, type LaneAssignment, type LayoutInterval } from '@/lib/appointments/overlapLayout'
import { formatAppointmentTicketNumber, getRecordDisplayTitle, getResolvedRecordColorToken } from '@/api/appointments'

const props = defineProps<{
  selectedDate: string
  records: AppointmentRecord[]
  shopHoursOnly?: boolean
  overlaySlots?: Array<{
    key: string
    date: string
    time: string
    durationMinutes: number
    bayId?: string
    kind: 'proposed_preview' | 'proposed_sent' | 'proposed_placeholder' | 'proposed_selected'
    customerName?: string
    vehicleLabel?: string
  }>
}>()

const emit = defineEmits<{
  (e: 'open', id: string): void
  (e: 'select-date', date: string): void
  (e: 'drag-start', id: string): void
  (e: 'drop', payload: { date: string; time: string }): void
  (e: 'create-at', payload: { date: string; baseTime: string; startTime: string; clientX: number; clientY: number }): void
  (e: 'create-note', payload: { date: string; clientX: number; clientY: number }): void
}>()

const bodyScrollEl = ref<HTMLElement | null>(null)

const now = ref(new Date())
let nowTimer: ReturnType<typeof setInterval> | undefined

const baseDate = computed(() => new Date(`${props.selectedDate}T00:00:00`))
const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
const todayKey = computed(() => toDateKey(now.value))

const days = computed(() =>
  Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(baseDate.value)
    d.setDate(baseDate.value.getDate() - baseDate.value.getDay() + idx)
    const date = toDateKey(d)
    return {
      date,
      isToday: date === todayKey.value,
      label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
    }
  })
)

const timeColumnWidthPx = computed(() => (props.shopHoursOnly ? 64 : 80))
const gridTemplateColumns = computed(() => `${timeColumnWidthPx.value}px repeat(${days.value.length}, minmax(0, 1fr))`)

const openBounds = computed(() => getShopOpenBounds())
const visibleStartHour = computed(() => (props.shopHoursOnly ? openBounds.value.startHour : GRID_START_HOUR))
const visibleEndHourExclusive = computed(() =>
  props.shopHoursOnly ? openBounds.value.endHourExclusive : GRID_END_HOUR + 1
)
const visibleStartMinutes = computed(() => visibleStartHour.value * 60)
const visibleEndMinutesExclusive = computed(() => visibleEndHourExclusive.value * 60)
const hiddenTopOffsetPx = computed(() => (visibleStartHour.value - GRID_START_HOUR) * SLOT_HEIGHT_PX)
const minimumGridWidthPx = computed(() => (props.shopHoursOnly ? 0 : 980))
const gridBodyStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = { minHeight: `${columnHeightPx.value}px` }
  if (props.shopHoursOnly) {
    style.width = '100%'
    return style
  }
  if (minimumGridWidthPx.value > 0) style.minWidth = `${minimumGridWidthPx.value}px`
  return style
})

const slots = computed(() => {
  const list: Array<{ key: string; time: string; label: string }> = []
  for (let hour = visibleStartHour.value; hour < visibleEndHourExclusive.value; hour += 1) {
    const time = `${hour.toString().padStart(2, '0')}:00`
    list.push({ key: `slot-${time}`, time, label: formatTimeLabel(time) })
  }
  return list
})

const dayCellBg = (day: { isToday: boolean }, slotTime: string) => {
  if (!isShopOpenSlot(slotTime)) return 'bg-slate-200'
  return day.isToday ? 'bg-slate-100/70' : ''
}

const columnHeightPx = computed(() => slots.value.length * SLOT_HEIGHT_PX)

const nowMinutes = computed(() => now.value.getHours() * 60 + now.value.getMinutes())
const nowSlotTime = computed(() => {
  const hour = Math.floor(nowMinutes.value / 60)
  return `${hour.toString().padStart(2, '0')}:00`
})
const isCurrentSlot = (slotTime: string) => slotTime === nowSlotTime.value

const nowLineTopPx = computed(() => {
  if (!days.value.some((d) => d.isToday)) return null
  const top = nowLineTopFromGridStart(nowMinutes.value)
  if (top === null) return null
  const adjustedTop = top - hiddenTopOffsetPx.value
  if (adjustedTop < 0 || adjustedTop >= columnHeightPx.value) return null
  return adjustedTop
})

const isBayBlocker = (record: AppointmentRecord) =>
  record.recordType === 'schedule_note' && record.scheduleBlockerType === 'bay_blocker'

const isCalendarScheduleNote = (record: AppointmentRecord) =>
  record.recordType === 'schedule_note' && !isBayBlocker(record)

const isDayColumnLaneRecord = (record: AppointmentRecord) =>
  record.recordType === 'confirmed' ||
  record.recordType === 'booked_unconfirmed' ||
  (record.recordType === 'schedule_note' && record.scheduleBlockerType !== 'bay_blocker')

const laneMapByDate = computed(() => {
  const m = new Map<string, Map<string, LaneAssignment>>()
  for (const day of days.value) {
    const intervals: LayoutInterval[] = []
    for (const record of props.records) {
      if (record.requestedDate !== day.date || !isDayColumnLaneRecord(record)) continue
      const start = toMinutes(record.requestedTime)
      const end = start + Math.max(0, record.requestedDuration)
      intervals.push({ id: record.id, start, end })
    }
    for (const slot of props.overlaySlots || []) {
      if (slot.date !== day.date) continue
      const start = toMinutes(slot.time)
      const end = start + Math.max(30, slot.durationMinutes || 30)
      intervals.push({ id: slot.key, start, end })
    }
    m.set(day.date, computeLaneLayout(intervals))
  }
  return m
})

const laneForRecordOnDate = (date: string, recordId: string): LaneAssignment =>
  laneMapByDate.value.get(date)?.get(recordId) ?? defaultLaneAssignment()

const laneForOverlayOnDate = (date: string, overlayId: string): LaneAssignment =>
  laneMapByDate.value.get(date)?.get(overlayId) ?? defaultLaneAssignment()

type LaneEntry = { record: AppointmentRecord; laneIndex: number; laneCount: number }
type PositionedBlock = Pick<AppointmentRecord, 'requestedDate' | 'requestedTime' | 'requestedDuration'>

const mapRecordsWithLanes = (
  date: string,
  pred: (r: AppointmentRecord) => boolean
): LaneEntry[] =>
  props.records
    .filter((r) => {
      if (r.requestedDate !== date || !pred(r)) return false
      const start = toMinutes(r.requestedTime)
      const end = start + Math.max(0, r.requestedDuration)
      return start < visibleEndMinutesExclusive.value && end > visibleStartMinutes.value
    })
    .map((record) => ({
      record,
      ...laneForRecordOnDate(date, record.id),
    }))

const appointmentsForDayColumn = (date: string) =>
  mapRecordsWithLanes(date, (r) => r.recordType !== 'schedule_note')

const calendarNotesForDayColumn = (date: string) =>
  mapRecordsWithLanes(date, (r) => isCalendarScheduleNote(r))

const overlayEntriesForDayColumn = (date: string) =>
  (props.overlaySlots || [])
    .filter((slot) => {
      if (slot.date !== date) return false
      const start = toMinutes(slot.time)
      const end = start + Math.max(30, slot.durationMinutes || 30)
      return start < visibleEndMinutesExclusive.value && end > visibleStartMinutes.value
    })
    .map((slot) => ({
      id: slot.key,
      requestedDate: slot.date,
      requestedTime: slot.time,
      requestedDuration: Math.max(30, slot.durationMinutes || 30),
      kind: slot.kind,
      customerName: slot.customerName || '',
      vehicleLabel: slot.vehicleLabel || '',
      ...laneForOverlayOnDate(date, slot.key),
    }))

const columnEventStyle = (
  record: PositionedBlock,
  _date: string,
  laneIndex: number,
  laneCount: number,
  zIndex: number
) => {
  const style = absoluteBlockStyle(record as AppointmentRecord, laneIndex, laneCount, zIndex, 0)
  if (!props.shopHoursOnly) return style
  const topPx = Number(String(style.top).replace('px', '')) - hiddenTopOffsetPx.value
  return { ...style, top: `${topPx}px` }
}

const eventClass = (record: AppointmentRecord) => {
  const base = getResolvedRecordColorToken(record)
  return record.recordType === 'booked_unconfirmed' ? `${base} border-dashed` : base
}
const scheduleNoteClass = getResolvedRecordColorToken({ recordType: 'schedule_note' })
const scheduleNoteTitle = (record: AppointmentRecord) =>
  (record.customerName || '').trim() || (record.note || '').trim() || 'Technician Unavailable'

const isAppointmentRecord = (record: AppointmentRecord) =>
  record.recordType === 'booked_unconfirmed' || record.recordType === 'confirmed'

const vehicleLabel = (record: AppointmentRecord) =>
  [record.vehicle?.year, record.vehicle?.make, record.vehicle?.model].filter(Boolean).join(' ')

const recordTitle = (record: AppointmentRecord) => getRecordDisplayTitle(record)

const endTime = (record: AppointmentRecord) => addMinutes(record.requestedTime, record.requestedDuration)

const bayBlockersForDayNotes = (date: string) =>
  props.records
    .filter((record) => record.requestedDate === date && isBayBlocker(record))

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

const emitCreateAt = (event: MouseEvent, date: string, baseTime: string) => {
  const target = event.target as HTMLElement | null
  if (target?.closest('[data-cell-interactive="true"]')) return
  const currentTarget = event.currentTarget as HTMLElement | null
  if (!currentTarget) return
  const rect = currentTarget.getBoundingClientRect()
  const clickY = event.clientY - rect.top
  const startMinutes = clickY >= rect.height / 2 ? '30' : '00'
  const hour = baseTime.split(':')[0] || '00'
  emit('create-at', {
    date,
    baseTime,
    startTime: `${hour}:${startMinutes}`,
    clientX: event.clientX,
    clientY: event.clientY,
  })
}

const emitOverlayPick = (
  event: MouseEvent,
  date: string,
  overlay: { requestedTime: string; kind: string }
) => {
  if (overlay.kind !== 'proposed_placeholder' && overlay.kind !== 'proposed_selected') return
  const time = overlay.requestedTime
  emit('create-at', {
    date,
    baseTime: time,
    startTime: time,
    clientX: event.clientX,
    clientY: event.clientY,
  })
}

const emitCreateNote = (event: MouseEvent, date: string) => {
  emit('create-note', {
    date,
    clientX: event.clientX,
    clientY: event.clientY,
  })
}

const runScrollToShopOpen = () => {
  if (props.shopHoursOnly) return
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
