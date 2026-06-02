<template>
  <div class="h-full min-h-0 overflow-x-auto rounded-md border bg-white" @dragend="onBayDragEnd">
    <div class="flex h-full min-h-[320px] min-h-0 w-max min-w-full flex-col">
      <div class="shrink-0 grid border-b-0 bg-white" :style="{ gridTemplateColumns }">
        <div class="border-b border-r bg-slate-50 p-2 text-xs font-medium text-slate-600">Time</div>
        <div
          v-for="bay in activeBays"
          :key="bay.bayId"
          class="border-b border-r bg-slate-50 p-2"
        >
          <div class="text-sm font-medium text-slate-900">{{ bay.bayName }}</div>
          <div class="text-xs text-slate-500">{{ bay.techName }}</div>
        </div>

        <div
          class="flex h-14 items-center border-r border-b bg-slate-50 px-2 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500"
        >
          Bay Notes
        </div>
        <div
          v-for="bay in activeBays"
          :key="`notes-${bay.bayId}`"
          class="flex h-14 cursor-pointer items-center border-b border-r bg-slate-50 px-2 py-1 hover:bg-slate-100"
          @click="emitCreateNote($event, bay.bayId)"
        ></div>
      </div>

      <div ref="bodyScrollEl" class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div class="relative flex min-w-[1100px]" :style="{ minHeight: `${columnHeightPx}px` }">
          <div
            class="sticky left-0 z-20 flex w-20 shrink-0 flex-col border-r bg-white"
            :style="{ minHeight: `${columnHeightPx}px` }"
          >
            <div
              v-for="slot in slots"
              :key="slot.key"
              class="relative h-14 shrink-0 border-b px-2 py-2 text-xs text-slate-500"
              :class="isCurrentHourSlot(slot.time) ? 'z-40' : 'z-10'"
            >
              {{ slot.label }}
              <div
                v-if="isSelectedDateToday && isCurrentHourSlot(slot.time) && nowLineTopPx !== null"
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
            class="grid min-w-0 flex-1"
            :style="{ gridTemplateColumns: `repeat(${activeBays.length}, minmax(200px, 1fr))`, minHeight: `${columnHeightPx}px` }"
          >
            <div
              v-for="bay in activeBays"
              :key="bay.bayId"
              class="relative border-r p-1"
              :style="{ minHeight: `${columnHeightPx}px` }"
            >
              <div
                v-if="isSelectedDateToday && nowLineTopPx !== null"
                class="pointer-events-none absolute inset-x-0 z-30 border-t-2 border-red-500"
                :style="{ top: `${nowLineTopPx}px` }"
              ></div>

              <div class="absolute inset-0 flex flex-col">
                <div
                  v-for="slot in slots"
                  :key="slot.key"
                  class="h-14 shrink-0 border-b border-dashed border-slate-200 transition-colors"
                  :class="[
                    bayBodyCellClass(slot.time),
                    baySlotZClass(slot.time),
                    dragHoverKey === slotHoverKey(bay.bayId, slot.time)
                      ? 'bg-blue-50/90 ring-2 ring-inset ring-blue-400/70'
                      : '',
                  ]"
                  @mousedown.right.prevent="startBlackoutDrag(bay.bayId, slot.time)"
                  @mouseenter="updateBlackoutDrag(bay.bayId, slot.time)"
                  @dragover="handleDragOverSlot($event, bay.bayId, slot.time)"
                  @drop="handleSlotDrop($event, bay.bayId, slot.time)"
                  @contextmenu.prevent
                  @click="emitCreateAt($event, bay.bayId, slot.time)"
                />
              </div>

              <div class="pointer-events-none absolute inset-0 p-1">
                <div
                  v-for="overlay in overlayEntriesForBayColumn(bay.bayId)"
                  :key="overlay.id"
                  class="absolute box-border overflow-hidden rounded border border-orange-300 bg-orange-100/85 px-2 py-1 text-left text-[11px] text-orange-900 shadow-sm"
                  :style="columnBayEventStyle(overlay, overlay.laneIndex, overlay.laneCount, 12)"
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
                  v-for="closure in shopClosuresForBayColumn(bay.bayId)"
                  :key="`${closure.id}-${bay.bayId}`"
                  type="button"
                  class="pointer-events-auto absolute box-border overflow-hidden rounded border px-2 py-1 text-left text-xs shadow-sm"
                  data-cell-interactive="true"
                  :class="eventClass(closure)"
                  :style="shopClosureColumnStyle(closure, 25)"
                  @pointerdown.stop
                  @click.stop="$emit('open', closure.id)"
                >
                  <div class="line-clamp-2 break-words text-left font-medium leading-tight">{{ shopClosureTitle(closure) }}</div>
                  <div class="line-clamp-2 break-words text-left text-[11px] leading-snug">{{ shopClosureTimeRange(closure) }}</div>
                </button>

                <button
                  v-for="entry in appointmentsForBayColumn(bay.bayId)"
                  :key="entry.record.id"
                  type="button"
                  draggable="true"
                  class="pointer-events-auto absolute box-border flex flex-col overflow-hidden rounded border px-2 py-1 text-left text-xs shadow-sm"
                  data-cell-interactive="true"
                  :class="eventClass(entry.record)"
                  :style="columnBayEventStyle(entry.record, entry.laneIndex, entry.laneCount)"
                  :title="bayAppointmentBlockTitle(entry.record)"
                  @dragstart="handleRecordDragStart($event, entry.record.id)"
                  @click.stop="$emit('open', entry.record.id)"
                >
                  <div class="line-clamp-2 break-words text-left font-medium leading-tight" :class="isCompact(entry.record) ? '' : 'mb-0.5'">
                    {{ entry.record.customerName }}
                  </div>
                  <div
                    v-if="appointmentTicketLabel(entry.record)"
                    class="line-clamp-1 text-left text-[10px] font-medium leading-tight text-slate-600"
                  >
                    {{ appointmentTicketLabel(entry.record) }}
                  </div>
                  <div
                    v-if="!isCompact(entry.record)"
                    class="line-clamp-3 min-h-0 flex-1 break-words text-left text-[11px] leading-snug"
                  >
                    {{ vehicleLabel(entry.record) }} · {{ entry.record.requestedTime }} - {{ endTime(entry.record) }}
                  </div>
                  <div
                    v-if="entry.record.recordType === 'booked_unconfirmed'"
                    class="mt-1 text-[10px] uppercase tracking-wide text-slate-600"
                  >
                    Unconfirmed
                  </div>
                </button>

                <button
                  v-for="entry in scheduleNotesForBayColumn(bay.bayId)"
                  :key="entry.record.id"
                  type="button"
                  draggable="true"
                  class="pointer-events-auto absolute box-border flex flex-col overflow-hidden rounded border px-2 py-1 text-left text-xs shadow-sm"
                  data-cell-interactive="true"
                  :class="scheduleNoteClass"
                  :style="columnBayEventStyle(entry.record, entry.laneIndex, entry.laneCount, 50)"
                  @dragstart="handleRecordDragStart($event, entry.record.id)"
                  @click.stop="$emit('open', entry.record.id)"
                >
                  <div class="line-clamp-2 break-words text-left font-medium leading-tight">{{ scheduleNoteTitle(entry.record) }}</div>
                  <div class="line-clamp-2 break-words text-left text-[11px] leading-snug">
                    {{ entry.record.requestedTime }} - {{ endTime(entry.record) }}
                  </div>
                </button>

                <button
                  v-for="entry in bayBlockersForBayColumn(bay.bayId)"
                  :key="entry.record.id"
                  type="button"
                  draggable="true"
                  class="pointer-events-auto absolute box-border flex flex-col overflow-hidden rounded border px-2 py-1 text-left text-xs shadow-sm"
                  data-cell-interactive="true"
                  :class="scheduleNoteClass"
                  :style="columnBayEventStyle(entry.record, entry.laneIndex, entry.laneCount, 55)"
                  @dragstart="handleRecordDragStart($event, entry.record.id)"
                  @click.stop="$emit('open', entry.record.id)"
                >
                  <div class="line-clamp-2 break-words text-left font-medium leading-tight">
                    {{ bayBlockerTitle(entry.record) }}
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
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue'
import type { AppointmentRecord, BayConfig } from '@/types/appointment'
import { addMinutes, formatTimeLabel, toMinutes } from '@/lib/appointments/time'
import {
  GRID_END_HOUR,
  GRID_START_HOUR,
  isShopOpenSlot,
  scrollGridToShopOpenHour,
  SLOT_HEIGHT_PX,
} from '@/lib/appointments/shopCalendar'
import {
  absoluteBlockStyle,
  dayColumnHeightPx,
  nowLineTopFromGridStart,
  recordInBayColumn,
  shopClosureColumnStyle,
} from '@/lib/appointments/calendarColumnLayout'
import { defaultLaneAssignment } from '@/lib/appointments/unifiedCalendarLanes'
import { computeLaneLayout, type LaneAssignment, type LayoutInterval } from '@/lib/appointments/overlapLayout'
import { formatAppointmentTicketNumber, getRecordDisplayTitle, getResolvedRecordColorToken } from '@/api/appointments'

const props = defineProps<{
  selectedDate: string
  records: AppointmentRecord[]
  bays: BayConfig[]
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

const emit = defineEmits<{
  (e: 'open', id: string): void
  (e: 'drag-start', id: string): void
  (e: 'drag-end'): void
  (e: 'drop', payload: { bayId: string; date: string; time: string }): void
  (e: 'create-blackout', payload: { bayId: string; date: string; startTime: string; endTimeExclusive: string }): void
  (e: 'create-at', payload: { bayId: string; date: string; baseTime: string; startTime: string; clientX: number; clientY: number }): void
  (e: 'create-note', payload: { date: string; bayId: string; clientX: number; clientY: number }): void
}>()

const bodyScrollEl = ref<HTMLElement | null>(null)
const dragHoverKey = ref<string | null>(null)

const slotHoverKey = (bayId: string, slotTime: string) => `${bayId}:${slotTime}`

const handleRecordDragStart = (event: DragEvent, recordId: string) => {
  const dt = event.dataTransfer
  if (dt) {
    dt.setData('text/plain', recordId)
    dt.effectAllowed = 'move'
  }
  emit('drag-start', recordId)
}

const handleDragOverSlot = (event: DragEvent, bayId: string, slotTime: string) => {
  event.preventDefault()
  dragHoverKey.value = slotHoverKey(bayId, slotTime)
  const dt = event.dataTransfer
  if (dt) dt.dropEffect = 'move'
}

const handleSlotDrop = (event: DragEvent, bayId: string, baseTime: string) => {
  event.preventDefault()
  dragHoverKey.value = null
  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const clickY = event.clientY - rect.top
  const half = clickY >= rect.height / 2 ? '30' : '00'
  const hour = baseTime.split(':')[0] || '00'
  const time = `${hour}:${half}`
  emit('drop', { bayId, date: props.selectedDate, time })
}

const onBayDragEnd = () => {
  dragHoverKey.value = null
  emit('drag-end')
}

const activeBays = computed(() => props.bays.filter((bay) => bay.isActive).sort((a, b) => a.sortOrder - b.sortOrder))

const gridTemplateColumns = computed(
  () => `80px repeat(${activeBays.value.length}, minmax(200px, 1fr))`
)

const now = ref(new Date())
let nowTimer: ReturnType<typeof setInterval> | null = null

const toDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const currentMinuteOfDay = computed(() => now.value.getHours() * 60 + now.value.getMinutes())
const currentTimeLabel = computed(() =>
  formatTimeLabel(`${now.value.getHours().toString().padStart(2, '0')}:${now.value.getMinutes().toString().padStart(2, '0')}`)
)
const isSelectedDateToday = computed(() => props.selectedDate === toDateKey(now.value))

const SLOT_INSET_PX = 4

const columnHeightPx = computed(() => dayColumnHeightPx())

const nowLineTopPx = computed(() => {
  if (!isSelectedDateToday.value) return null
  return nowLineTopFromGridStart(currentMinuteOfDay.value)
})

const nowLineOffsetInSlotPx = computed(() =>
  Math.min(SLOT_HEIGHT_PX - 1, SLOT_INSET_PX + Math.round(((currentMinuteOfDay.value % 60) / 60) * SLOT_HEIGHT_PX))
)

const slots = computed(() => {
  const list: Array<{ key: string; time: string; label: string }> = []
  for (let hour = GRID_START_HOUR; hour <= GRID_END_HOUR; hour += 1) {
    const time = `${hour.toString().padStart(2, '0')}:00`
    list.push({ key: `bay-${time}`, time, label: formatTimeLabel(time) })
  }
  return list
})

const bayBodyCellClass = (slotTime: string) => {
  if (!isShopOpenSlot(slotTime) || hasShopClosureInHour(slotTime)) return 'bg-slate-200'
  return ''
}

const laneMapByBayId = computed(() => {
  const m = new Map<string, Map<string, LaneAssignment>>()
  for (const bay of activeBays.value) {
    const intervals: LayoutInterval[] = []
    for (const record of props.records) {
      if (record.requestedDate !== props.selectedDate) continue
      if ((record.bayId || 'NB') !== bay.bayId) continue
      const isLaneRecord =
        record.recordType === 'confirmed' ||
        record.recordType === 'booked_unconfirmed' ||
        (record.recordType === 'schedule_note' && record.scheduleBlockerType !== 'shop_close')
      if (!isLaneRecord) continue
      const start = toMinutes(record.requestedTime)
      const end = start + Math.max(0, record.requestedDuration)
      intervals.push({ id: record.id, start, end })
    }
    for (const slot of props.overlaySlots || []) {
      if (slot.date !== props.selectedDate) continue
      if ((slot.bayId || 'NB') !== bay.bayId) continue
      const start = toMinutes(slot.time)
      const end = start + Math.max(30, slot.durationMinutes || 30)
      intervals.push({ id: slot.key, start, end })
    }
    m.set(bay.bayId, computeLaneLayout(intervals))
  }
  return m
})

const laneForBayRecord = (bayId: string, recordId: string): LaneAssignment =>
  laneMapByBayId.value.get(bayId)?.get(recordId) ?? defaultLaneAssignment()

const laneForBayOverlay = (bayId: string, overlayId: string): LaneAssignment =>
  laneMapByBayId.value.get(bayId)?.get(overlayId) ?? defaultLaneAssignment()

const isBayBlocker = (record: AppointmentRecord) =>
  record.recordType === 'schedule_note' && record.scheduleBlockerType === 'bay_blocker'

const isShopClosure = (record: AppointmentRecord) =>
  record.recordType === 'schedule_note' && record.scheduleBlockerType === 'shop_close'

const isBayScheduleNote = (record: AppointmentRecord) =>
  record.recordType === 'schedule_note' && !isShopClosure(record) && !isBayBlocker(record)

const hasOverlappingBayBlocker = (record: AppointmentRecord) => {
  const start = toMinutes(record.requestedTime)
  const end = start + record.requestedDuration
  const recordBay = record.bayId || 'NB'
  return props.records.some((candidate) => {
    if (!isBayBlocker(candidate) || candidate.id === record.id) return false
    if (candidate.requestedDate !== record.requestedDate) return false
    if ((candidate.bayId || 'NB') !== recordBay) return false
    const candidateStart = toMinutes(candidate.requestedTime)
    const candidateEnd = candidateStart + candidate.requestedDuration
    return candidateStart < end && candidateEnd > start
  })
}

type LaneEntry = { record: AppointmentRecord; laneIndex: number; laneCount: number }
type PositionedBlock = Pick<AppointmentRecord, 'requestedDate' | 'requestedTime' | 'requestedDuration'>

const mapBayColumnRecords = (bayId: string, pred: (r: AppointmentRecord) => boolean): LaneEntry[] =>
  props.records
    .filter((r) => recordInBayColumn(r, props.selectedDate, bayId) && pred(r))
    .map((record) => ({
      record,
      ...laneForBayRecord(bayId, record.id),
    }))

const shopClosuresForBayColumn = (_bayId: string) =>
  props.records
    .filter(
      (r) =>
        r.recordType === 'schedule_note' &&
        r.scheduleBlockerType === 'shop_close' &&
        recordInBayColumn(r, props.selectedDate, _bayId)
    )

const appointmentsForBayColumn = (bayId: string) =>
  mapBayColumnRecords(bayId, (r) => r.recordType !== 'schedule_note')

const scheduleNotesForBayColumn = (bayId: string) => mapBayColumnRecords(bayId, (r) => isBayScheduleNote(r))

const bayBlockersForBayColumn = (bayId: string) => mapBayColumnRecords(bayId, (r) => isBayBlocker(r))

const overlayEntriesForBayColumn = (bayId: string) =>
  (props.overlaySlots || [])
    .filter((slot) => {
      if (slot.date !== props.selectedDate) return false
      if ((slot.bayId || 'NB') !== bayId) return false
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
      ...laneForBayOverlay(bayId, slot.key),
    }))

const columnBayEventStyle = (
  record: PositionedBlock,
  laneIndex: number,
  laneCount: number,
  zIndex = 10
) =>
  absoluteBlockStyle(
    record as AppointmentRecord,
    laneIndex,
    laneCount,
    zIndex,
    'recordType' in record && hasOverlappingBayBlocker(record as AppointmentRecord) ? 24 : 0
  )

const vehicleLabel = (record: AppointmentRecord) =>
  [record.vehicle?.year, record.vehicle?.make, record.vehicle?.model].filter(Boolean).join(' ') || 'No vehicle'

const endTime = (record: AppointmentRecord) => addMinutes(record.requestedTime, record.requestedDuration)

const appointmentTicketLabel = (record: AppointmentRecord) => formatAppointmentTicketNumber(record) ?? ''

const bayAppointmentBlockTitle = (record: AppointmentRecord) => {
  const ticket = formatAppointmentTicketNumber(record)
  const base = `${record.customerName} ${record.requestedTime}-${endTime(record)}`
  return ticket ? `${base} (${ticket})` : base
}

const eventClass = (record: AppointmentRecord) => {
  const base = getResolvedRecordColorToken(record)
  if (record.recordType === 'booked_unconfirmed') {
    return `${base} border-dashed`
  }
  return base
}

const scheduleNoteClass = getResolvedRecordColorToken({ recordType: 'schedule_note' })

const baySlotZClass = (slotTime: string) => {
  if (hasShopClosureInHour(slotTime)) return 'z-[32]'
  if (isCurrentHourSlot(slotTime)) return 'z-20'
  return 'z-0'
}

const shopClosureTitle = (record: AppointmentRecord) => getRecordDisplayTitle(record)
const shopClosureTimeRange = (record: AppointmentRecord) =>
  `${record.requestedTime} - ${endTime(record)}`

const scheduleNoteTitle = (record: AppointmentRecord) =>
  (record.customerName || '').trim() || (record.note || '').trim() || 'Technician Unavailable'
const bayBlockerTitle = (record: AppointmentRecord) => `${record.bayName || record.bayId || 'Bay'} Blocker`

const isCompact = (record: AppointmentRecord) =>
  Math.round((Math.min(record.requestedDuration, 60) / 60) * SLOT_HEIGHT_PX) < 40

const isCurrentHourSlot = (slotTime: string) => {
  if (!isSelectedDateToday.value) return false
  const slotStart = toMinutes(slotTime)
  const slotEnd = slotStart + 60
  return currentMinuteOfDay.value >= slotStart && currentMinuteOfDay.value < slotEnd
}

const overlapsHourSlot = (record: AppointmentRecord, slotTime: string) => {
  const slotStart = toMinutes(slotTime)
  const slotEnd = slotStart + 60
  const appointmentStart = toMinutes(record.requestedTime)
  const appointmentEnd = appointmentStart + record.requestedDuration
  return appointmentStart < slotEnd && appointmentEnd > slotStart
}

const hasBayBlockerInHour = (bayId: string, slotTime: string) =>
  props.records.some(
    (record) =>
      record.recordType === 'schedule_note' &&
      record.scheduleBlockerType === 'bay_blocker' &&
      (record.bayId || 'NB') === bayId &&
      record.requestedDate === props.selectedDate &&
      overlapsHourSlot(record, slotTime)
  )

const hasShopClosureInHour = (slotTime: string) =>
  props.records.some(
    (record) =>
      record.recordType === 'schedule_note' &&
      record.scheduleBlockerType === 'shop_close' &&
      record.requestedDate === props.selectedDate &&
      overlapsHourSlot(record, slotTime)
  )

const isRightDragSelecting = ref(false)
const dragBayId = ref<string | null>(null)
const dragStartTime = ref<string | null>(null)
const dragCurrentTime = ref<string | null>(null)

const shouldBlockBlackoutCell = (bayId: string, slotTime: string) =>
  hasShopClosureInHour(slotTime) || hasBayBlockerInHour(bayId, slotTime)

const startBlackoutDrag = (bayId: string, slotTime: string) => {
  if (shouldBlockBlackoutCell(bayId, slotTime)) return
  isRightDragSelecting.value = true
  dragBayId.value = bayId
  dragStartTime.value = slotTime
  dragCurrentTime.value = slotTime
}

const updateBlackoutDrag = (bayId: string, slotTime: string) => {
  if (!isRightDragSelecting.value || dragBayId.value !== bayId) return
  if (shouldBlockBlackoutCell(bayId, slotTime)) return
  dragCurrentTime.value = slotTime
}

const resetBlackoutDrag = () => {
  isRightDragSelecting.value = false
  dragBayId.value = null
  dragStartTime.value = null
  dragCurrentTime.value = null
}

const finishBlackoutDrag = () => {
  if (!isRightDragSelecting.value || !dragBayId.value || !dragStartTime.value || !dragCurrentTime.value) {
    resetBlackoutDrag()
    return
  }
  const startMinutes = toMinutes(dragStartTime.value)
  const endMinutes = toMinutes(dragCurrentTime.value)
  const minMinutes = Math.min(startMinutes, endMinutes)
  const maxMinutes = Math.max(startMinutes, endMinutes)
  const rangeStart = `${Math.floor(minMinutes / 60)
    .toString()
    .padStart(2, '0')}:00`
  const rangeEndExclusive = `${Math.floor(maxMinutes / 60)
    .toString()
    .padStart(2, '0')}:00`
  emit('create-blackout', {
    bayId: dragBayId.value,
    date: props.selectedDate,
    startTime: rangeStart,
    endTimeExclusive: rangeEndExclusive,
  })
  resetBlackoutDrag()
}

const handleGlobalMouseUp = (event: MouseEvent) => {
  if (!isRightDragSelecting.value) return
  if (event.button !== 2) {
    resetBlackoutDrag()
    return
  }
  finishBlackoutDrag()
}

const emitCreateAt = (event: MouseEvent, bayId: string, baseTime: string) => {
  const target = event.target as HTMLElement | null
  if (target?.closest('[data-cell-interactive="true"]')) return
  const currentTarget = event.currentTarget as HTMLElement | null
  if (!currentTarget) return
  const rect = currentTarget.getBoundingClientRect()
  const clickY = event.clientY - rect.top
  const startMinutes = clickY >= rect.height / 2 ? '30' : '00'
  const hour = baseTime.split(':')[0] || '00'
  emit('create-at', {
    bayId,
    date: props.selectedDate,
    baseTime,
    startTime: `${hour}:${startMinutes}`,
    clientX: event.clientX,
    clientY: event.clientY,
  })
}

const emitCreateNote = (event: MouseEvent, bayId: string) => {
  emit('create-note', {
    date: props.selectedDate,
    bayId,
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
  }, 30_000)
  window.addEventListener('mouseup', handleGlobalMouseUp)
  runScrollToShopOpen()
})

watch(
  () => props.selectedDate,
  () => {
    runScrollToShopOpen()
  }
)

onBeforeUnmount(() => {
  window.removeEventListener('mouseup', handleGlobalMouseUp)
  if (!nowTimer) return
  clearInterval(nowTimer)
  nowTimer = null
})

</script>
