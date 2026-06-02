<template>
  <div class="flex h-[100dvh] flex-col overflow-hidden bg-brand-shell">
    <AppointmentsHeader
      :active-view="activeView"
      :calendar-view="calendarView"
      :date="selectedDate"
      :search-draft="searchDraft"
      :filters="filters"
      @update:active-view="activeView = $event"
      @update:calendar-view="calendarView = $event"
      @update:date="selectedDate = $event"
      @update:search-draft="updateSearchDraft"
      @submit-search="submitSearch"
      @update:filters="filters = $event"
      @clear-filters="clearHeaderFilters"
      @today="jumpToToday"
      @refresh="handleManualRefresh"
      @create="openCreateRecordFromIntent"
      @open-scheduler="openSchedulerModal"
    />

    <Teleport to="body">
      <div v-show="isSchedulerOpen" class="fixed inset-0 z-[210]">
        <div class="absolute inset-0 bg-black/50" @click="closeSchedulerModal" />
        <div class="absolute inset-0 overflow-y-auto p-3 sm:p-6">
          <div class="mx-auto w-full max-w-7xl">
            <div class="rounded-lg bg-white shadow-xl" @click.stop>
              <BookingScheduler
                mode="app"
                :show-page-header="false"
                :show-close-button="true"
                @close="closeSchedulerModal"
              />
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <div class="flex min-h-0 flex-1 flex-col p-4" :key="appointmentsMainPaneKey">
      <MonthGrid
        v-if="activeView === 'calendar' && calendarView === 'month'"
        class="h-full"
        :selected-date="selectedDate"
        :records="visibleRecords"
        @open="openDrawer"
        @select-date="openDayFromMonth"
        @show-more="openDayOverflow"
      />

      <WeekGrid
        v-else-if="activeView === 'calendar' && calendarView === 'week'"
        class="h-full"
        :selected-date="selectedDate"
        :records="visibleRecords"
        :overlay-slots="activeProposedOverlaySlots"
        @open="openDrawer"
        @select-date="selectedDate = $event"
        @create-note="openCreateMenuForDayNote('calendar', $event)"
        @create-at="openCreateMenuForCalendarSlot"
        @drag-start="onDragStart"
        @drop="onCalendarDrop"
      />

      <DayGrid
        v-else-if="activeView === 'calendar' && calendarView === 'day'"
        class="h-full"
        :selected-date="selectedDate"
        :records="visibleRecords"
        :overlay-slots="activeProposedOverlaySlots"
        @open="openDrawer"
        @create-note="openCreateMenuForDayNote('calendar', $event)"
        @create-at="openCreateMenuForCalendarSlot"
        @drag-start="onDragStart"
        @drop="onCalendarDrop"
      />

      <BayViewGrid
        v-else-if="activeView === 'bay'"
        class="h-full"
        :selected-date="selectedDate"
        :records="visibleRecords"
        :bays="bayConfig"
        :overlay-slots="activeProposedOverlaySlots"
        @open="openDrawer"
        @create-note="openCreateMenuForDayNote('bay', $event)"
        @create-at="openCreateMenuForBaySlot"
        @drag-start="onDragStart"
        @drag-end="onDragEnd"
        @drop="onBayDrop"
        @create-blackout="createBlackout"
        @delete="removeRecord"
      />

      <AppointmentsListView v-else :records="listViewRecords" @open="openDrawer" />
    </div>

    <AppointmentDetailDrawer
      :record="selectedRecord"
      :autofocus-customer-name="Boolean(selectedRecord && isPlaceholderRecord(selectedRecord.id))"
      @close="selectedRecordId = null"
      @attempt-close="handleDrawerAttemptClose"
      @save="saveRecord"
      @delete="removeRecord"
      @confirm="confirmRecord"
      @reschedule="openRescheduleFlow"
      @request-color-change="handleColorChangeRequest"
    />

    <QuickNoteCreateDrawer
      :open="showQuickNoteDrawer"
      :draft="quickNoteDraft"
      @close="showQuickNoteDrawer = false"
      @save="saveQuickNoteDraft"
      @create-appointment="createAppointmentFromQuickNoteDrawer"
    />

    <ScheduleNoteCreateDrawer
      :open="showScheduleNoteDrawer"
      :draft="scheduleNoteDraft"
      :bays="bayConfig"
      :schedule-blocker-options="scheduleNoteBlockerOptions"
      @close="showScheduleNoteDrawer = false"
      @save="saveScheduleNoteDraft"
    />

    <Dialog v-model="showReschedulePicker">
      <DialogContent class="max-h-[92vh] w-[min(1280px,calc(100vw-0.5rem))] max-w-none overflow-y-auto p-3 sm:p-4">
        <DialogHeader>
          <DialogTitle>Reschedule — pick up to 3 times</DialogTitle>
        </DialogHeader>
        <p class="mb-2 text-xs text-slate-500">
          Tap an open slot on the week grid, or use a suggested time. Only shop-hour slots are offered to the customer.
        </p>
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            @click="moveRescheduleWeek(-1)"
          >
            ← Prev week
          </button>
          <button
            type="button"
            class="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            @click="moveRescheduleWeek(1)"
          >
            Next week →
          </button>
          <label class="ml-1 flex items-center gap-2 text-xs text-slate-600">
            <span class="whitespace-nowrap">Jump to date</span>
            <input
              :value="rescheduleSelectedDate"
              type="date"
              class="h-8 rounded-md border border-slate-300 px-2 text-xs text-slate-700"
              @input="onRescheduleDateInput"
            />
          </label>
        </div>
        <WeekGrid
          :selected-date="rescheduleSelectedDate"
          :records="visibleRecords"
          :shop-hours-only="true"
          :overlay-slots="rescheduleModalOverlaySlots"
          @select-date="rescheduleSelectedDate = $event"
          @create-at="onRescheduleCalendarPick"
          @open="() => {}"
          @drag-start="() => {}"
          @drop="() => {}"
          @create-note="() => {}"
        />
        <p v-if="isRescheduleSuggestionsLoading" class="mt-2 text-xs text-slate-500">Loading suggested times…</p>
        <div v-if="rescheduleSuggestions.length" class="mt-4">
          <span class="mb-1 block text-xs font-medium text-slate-600">Suggested times</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="(s, idx) in rescheduleSuggestions"
              :key="`sug-${idx}-${s.date}-${s.time}`"
              type="button"
              class="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 hover:bg-slate-100 disabled:opacity-40"
              :disabled="rescheduleSelectedSlots.length >= 3 || rescheduleSlotSelected(s)"
              @click="addRescheduleSlot(s)"
            >
              {{ formatRescheduleSlotLabel(s) }}
            </button>
          </div>
        </div>
        <div class="mt-4">
          <span class="mb-1 block text-xs font-medium text-slate-600">Selected ({{ rescheduleSelectedSlots.length }}/3)</span>
          <div v-if="!rescheduleSelectedSlots.length" class="text-xs text-slate-500">None yet.</div>
          <div v-else class="flex flex-wrap gap-2">
            <button
              v-for="(s, idx) in rescheduleSelectedSlots"
              :key="`sel-${idx}-${s.date}-${s.time}`"
              type="button"
              class="rounded-full border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-white"
              title="Remove"
              @click="removeRescheduleSlot(s)"
            >
              {{ formatRescheduleSlotLabel(s) }} ×
            </button>
          </div>
        </div>
        <p v-if="rescheduleMintError" class="mt-2 text-xs text-red-600">{{ rescheduleMintError }}</p>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="rounded-md border px-3 py-2 text-sm" @click="closeReschedulePicker">Cancel</button>
          <button
            type="button"
            class="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            :disabled="rescheduleSelectedSlots.length === 0 || rescheduleMinting"
            @click="goRescheduleMintAndSendDialog"
          >
            {{ rescheduleMinting ? 'Working…' : 'Next' }}
          </button>
        </div>
      </DialogContent>
    </Dialog>

    <RescheduleLinkSendDialog
      v-model="showRescheduleSend"
      v-model:message="rescheduleSmsMessage"
      :slots="rescheduleSelectedSlots"
      :reschedule-url="reschedulePublicUrl"
      :customer-phone="rescheduleCustomerPhone"
      @sent="onRescheduleSmsSent"
    />

    <Teleport to="body">
      <div
        v-if="createMenu.open"
        ref="createMenuRef"
        class="fixed z-50 w-48 rounded-md border border-slate-200 bg-white p-1 shadow-lg"
        :style="{ top: `${createMenu.top}px`, left: `${createMenu.left}px` }"
      >
        <button
          v-for="intent in createMenu.options"
          :key="intent"
          type="button"
          class="w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
          @click="selectCreateMenuIntent(intent)"
        >
          {{ getCreateIntentLabel(intent) }}
        </button>
      </div>
    </Teleport>

    <Dialog v-model="showDayOverflow">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Appointments for {{ overflowDate }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-2">
          <button
            v-for="record in overflowRecords"
            :key="record.id"
            type="button"
            class="w-full rounded border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50"
            @click="openFromOverflow(record.id)"
          >
            {{ record.requestedTime }} · {{ getRecordDisplayTitle(record) }}
          </button>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog v-model="showCreateModal">
      <DialogContent class="max-w-xl">
        <DialogHeader>
          <DialogTitle>{{ createModalTitle }}</DialogTitle>
        </DialogHeader>
        <div class="grid gap-3 md:grid-cols-2">
          <label class="text-sm">
            <span class="mb-1 block text-xs text-slate-600">
              {{ isAppointmentDraft ? 'Customer name' : 'Title (optional)' }}
            </span>
            <input v-model="createDraft.customerName" class="h-9 w-full rounded-md border border-slate-200 px-2" />
          </label>
          <label v-if="isAppointmentDraft" class="text-sm">
            <span class="mb-1 block text-xs text-slate-600">Status</span>
            <select v-model="createDraft.status" class="h-9 w-full rounded-md border border-slate-200 px-2">
              <option v-for="option in statusOptions" :key="option" :value="option">{{ appointmentStatusLabel(option) }}</option>
            </select>
          </label>
          <label v-if="isScheduleNoteDraft" class="text-sm">
            <span class="mb-1 block text-xs text-slate-600">Schedule blocker type</span>
            <select v-model="createDraft.scheduleBlockerType" class="h-9 w-full rounded-md border border-slate-200 px-2">
              <option value="">Select blocker type</option>
              <option v-for="option in scheduleNoteBlockerOptions" :key="option" :value="option">
                {{ getScheduleBlockerTypeLabel(option) }}
              </option>
            </select>
          </label>
          <label v-if="isAppointmentDraft || isScheduleNoteDraft" class="text-sm">
            <span class="mb-1 block text-xs text-slate-600">Bay</span>
            <select v-model="createDraft.bayId" class="h-9 w-full rounded-md border border-slate-200 px-2">
              <option v-for="bay in bayConfig" :key="bay.bayId" :value="bay.bayId">{{ bay.bayName }}</option>
            </select>
          </label>
          <label class="text-sm">
            <span class="mb-1 block text-xs text-slate-600">Date</span>
            <input v-model="createDraft.requestedDate" type="date" class="h-9 w-full rounded-md border border-slate-200 px-2" />
          </label>
          <label class="text-sm">
            <span class="mb-1 block text-xs text-slate-600">Time</span>
            <input v-model="createDraft.requestedTime" type="time" class="h-9 w-full rounded-md border border-slate-200 px-2" />
          </label>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="text-sm">
              <span class="mb-1 block text-xs text-slate-600">Duration (hours)</span>
              <input
                v-model.number="createDurationHours"
                type="number"
                min="0"
                step="1"
                class="h-9 w-full rounded-md border border-slate-200 px-2"
              />
            </label>
            <label class="text-sm">
              <span class="mb-1 block text-xs text-slate-600">Duration (minutes)</span>
              <input
                v-model.number="createDurationMinutes"
                type="number"
                min="0"
                max="59"
                step="15"
                class="h-9 w-full rounded-md border border-slate-200 px-2"
              />
            </label>
          </div>
        </div>
        <label class="mt-3 block text-sm">
          <span class="mb-1 block text-xs text-slate-600">Note</span>
          <textarea v-model="createDraft.note" rows="3" class="w-full rounded-md border border-slate-200 p-2" />
        </label>
        <p v-if="createDraftValidationMessage" class="mt-2 text-xs text-red-600">{{ createDraftValidationMessage }}</p>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="rounded-md border px-3 py-2 text-sm" @click="showCreateModal = false">Cancel</button>
          <button type="button" class="rounded-md bg-slate-900 px-3 py-2 text-sm text-white" @click="saveCreateDraft">Save</button>
          <button
            v-if="isQuickNoteDraft"
            type="button"
            class="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            @click="createAppointmentFromQuickNoteDraft"
          >
            Create Appointment
          </button>
        </div>
      </DialogContent>
    </Dialog>

    <div
      v-if="undoState.visible"
      class="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 shadow-lg"
    >
      <span class="text-sm text-slate-700">{{ undoState.message }}</span>
      <button type="button" class="text-sm font-medium text-brand-accent underline" @click="runUndo">Undo</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type {
  AppointmentBlockColorKey,
  AppointmentRecord,
  AppointmentRecordType,
  AppointmentStatus,
  ScheduleNoteBlockerType,
} from '@/types/appointment'
import {
  applyColorToAllRecordsOfType,
  getColorScopeTypeForRecordType,
  canDropInBaySlot,
  confirmAppointmentRecord,
  createAppointmentRecord,
  getRecordDisplayTitle,
  deleteAppointmentRecord,
  getScheduleBlockerTypeLabel,
  isRecordVisibleInView,
  listAppointments,
  requiresCustomerNameForRecordType,
  requiresScheduleBlockerTypeForRecordType,
  setAppointmentRecordColorOverride,
  updateAppointmentRecord,
  sortAppointmentRecords,
} from '@/api/appointments'
import {
  applyPendingRescheduleOffersFromServer,
  fetchAppointmentRescheduleOfferStatus,
  mintAppointmentRescheduleOffer,
} from '@/api/appointmentRescheduleServer'
import { sendChatMessage } from '@/api/chat'
import { STATIC_BAY_CONFIG } from '@/config/bays'
import { useAppointmentFilters } from '@/composables/useAppointmentFilters'
import { useAppointmentScheduler } from '@/composables/useAppointmentScheduler'
import AppointmentsHeader from '@/components/appointments/AppointmentsHeader.vue'
import MonthGrid from '@/components/appointments/calendar/MonthGrid.vue'
import WeekGrid from '@/components/appointments/calendar/WeekGrid.vue'
import DayGrid from '@/components/appointments/calendar/DayGrid.vue'
import BayViewGrid from '@/components/appointments/bay/BayViewGrid.vue'
import AppointmentsListView from '@/components/appointments/AppointmentsListView.vue'
import AppointmentDetailDrawer from '@/components/appointments/AppointmentDetailDrawer.vue'
import RescheduleLinkSendDialog from '@/components/appointments/RescheduleLinkSendDialog.vue'
import QuickNoteCreateDrawer from '@/components/appointments/QuickNoteCreateDrawer.vue'
import ScheduleNoteCreateDrawer from '@/components/appointments/ScheduleNoteCreateDrawer.vue'
import Dialog from '@/components/ui/Dialog.vue'
import DialogContent from '@/components/ui/DialogContent.vue'
import DialogHeader from '@/components/ui/DialogHeader.vue'
import DialogTitle from '@/components/ui/DialogTitle.vue'
import { normalizeDuration, toDurationParts, toTotalMinutes } from '@/lib/appointments/duration'
import { formatTimeLabel, toMinutes } from '@/lib/appointments/time'
import {
  buildRescheduleSuggestions,
  isFutureRescheduleSlot,
  type RescheduleSuggestionSlot,
} from '@/lib/appointments/rescheduleSuggestions'
import { isShopOpenSlot } from '@/lib/appointments/shopCalendar'
import { getSelectedStoreNum, useStoreContext } from '@/composables/useStoreContext'
import { clampPopoverLeft } from '@/lib/popover-position'
import { alertAnchored, confirmAnchored } from '@/lib/ui/anchoredUserDialog'
import BookingScheduler from '@/components/appointments/BookingScheduler.vue'

type ViewMode = 'calendar' | 'bay' | 'list'
type CalendarMode = 'month' | 'week' | 'day'
type CreateIntent = 'appointment' | 'quick_note' | 'schedule_note'
type CreateSource = 'calendar' | 'bay'
type CreateMenuTrigger = 'timeslot' | 'day_notes'
type SlotCreatePayload = { date: string; baseTime: string; startTime: string; bayId?: string; clientX: number; clientY: number }
type DayNotePayload = { date: string; clientX: number; clientY: number; bayId?: string }
type ProposedOverlayKind = 'proposed_preview' | 'proposed_sent' | 'proposed_placeholder' | 'proposed_selected'
type ProposedOverlaySlot = {
  key: string
  date: string
  time: string
  durationMinutes: number
  bayId?: string
  kind: ProposedOverlayKind
  customerName?: string
  vehicleLabel?: string
}
type PendingProposedOffer = {
  token: string
  recordId: string
  bayId: string
  durationMinutes: number
  slots: RescheduleSuggestionSlot[]
  expiresAt: string
}

const SHELL_STORAGE_KEY = 'hd_appointments_shell_state'
const PROPOSED_OFFERS_STORAGE_KEY = 'hd_appointments_proposed_offers'

const { selectedStoreLabel } = useStoreContext()
const storedShell = loadShellState()
const todayIsoDate = new Date().toISOString().slice(0, 10)
const activeView = ref<ViewMode>(storedShell.activeView || 'calendar')
const calendarView = ref<CalendarMode>(storedShell.calendarView || 'week')
const selectedDate = ref<string>(todayIsoDate)
const records = ref<AppointmentRecord[]>([])
const selectedRecordId = ref<string | null>(null)
const draggingRecordId = ref<string | null>(null)
const placeholderRecordIds = ref<string[]>([])

const showReschedulePicker = ref(false)
const showRescheduleSend = ref(false)
const rescheduleTargetId = ref<string | null>(null)
const rescheduleSelectedDate = ref('')
const rescheduleSelectedSlots = ref<RescheduleSuggestionSlot[]>([])
const rescheduleSuggestions = ref<RescheduleSuggestionSlot[]>([])
const rescheduleMinting = ref(false)
const rescheduleMintError = ref('')
const rescheduleSmsMessage = ref('')
const reschedulePublicUrl = ref('')
const rescheduleCustomerPhone = ref('')
const reschedulePendingSendOffer = ref<PendingProposedOffer | null>(null)
const activeProposedOffers = ref<PendingProposedOffer[]>(loadProposedOffers())
const isReconcilingProposedOffers = ref(false)
const isRescheduleSuggestionsLoading = ref(false)
let proposedOffersTimer: ReturnType<typeof setInterval> | null = null
const rescheduleShopName = computed(() => selectedStoreLabel.value.replace(/\s*\(Store\s*#\d+\)\s*$/i, '').trim())

const showDayOverflow = ref(false)
const overflowDate = ref('')
const showCreateModal = ref(false)
const createSource = ref<CreateSource>('calendar')
const showQuickNoteDrawer = ref(false)
const showScheduleNoteDrawer = ref(false)
const createMenuRef = ref<HTMLElement | null>(null)
const createMenu = ref<{
  open: boolean
  top: number
  left: number
  source: CreateSource
  trigger: CreateMenuTrigger
  options: CreateIntent[]
  slot: { date: string; baseTime?: string; startTime?: string; bayId?: string } | null
}>({
  open: false,
  top: 0,
  left: 0,
  source: 'calendar',
  trigger: 'timeslot',
  options: [],
  slot: null,
})

const bayConfig = STATIC_BAY_CONFIG
const { filters, matchesRecord, clearFilters } = useAppointmentFilters()
const searchDraft = ref(filters.value.search || '')
const scheduleNoteBlockerOptionsBySource: Record<CreateSource, ScheduleNoteBlockerType[]> = {
  calendar: ['shop_close', 'technician_unavailable'],
  bay: ['bay_blocker', 'technician_unavailable'],
}
const scheduleNoteBlockerOptions = computed<ScheduleNoteBlockerType[]>(
  () => scheduleNoteBlockerOptionsBySource[createSource.value]
)

watch([activeView, calendarView, selectedDate], () => {
  localStorage.setItem(
    SHELL_STORAGE_KEY,
    JSON.stringify({
      activeView: activeView.value,
      calendarView: calendarView.value,
      selectedDate: selectedDate.value,
    })
  )
})

const filteredRecords = computed(() => records.value.filter((record) => matchesRecord(record)))
const sortedRecords = computed(() => sortAppointmentRecords(filteredRecords.value, filters.value.sortBy))
const visibleRecords = computed(() =>
  sortedRecords.value.filter((record) => isRecordVisibleInView(record, activeView.value))
)
const listViewRecords = computed(() =>
  visibleRecords.value.filter((record) => record.requestedDate === selectedDate.value)
)

const overlayVehicleLabel = (record: AppointmentRecord | null | undefined) =>
  [record?.vehicle?.year, record?.vehicle?.make, record?.vehicle?.model].filter(Boolean).join(' ')

const activeProposedOverlaySlots = computed<ProposedOverlaySlot[]>(() => {
  const overlays: ProposedOverlaySlot[] = []
  for (const offer of activeProposedOffers.value) {
    const offerRecord = records.value.find((record) => record.id === offer.recordId)
    for (const slot of offer.slots) {
      overlays.push({
        key: `offer-${offer.token}-${slot.date}-${slot.time}`,
        date: slot.date,
        time: slot.time,
        durationMinutes: offer.durationMinutes,
        bayId: offer.bayId,
        kind: 'proposed_sent',
        customerName: offerRecord?.customerName || undefined,
        vehicleLabel: overlayVehicleLabel(offerRecord) || undefined,
      })
    }
  }
  return overlays
})

const rescheduleModalOverlaySlots = computed<ProposedOverlaySlot[]>(() => {
  const record = rescheduleTargetId.value ? records.value.find((r) => r.id === rescheduleTargetId.value) : null
  const durationMinutes = Math.max(30, record?.requestedDuration || 60)
  const selectedKeys = new Set(rescheduleSelectedSlots.value.map((slot) => `${slot.date}|${slot.time}`))
  return rescheduleSuggestions.value.map((slot) => {
    const key = `${slot.date}|${slot.time}`
    const isSelected = selectedKeys.has(key)
    return {
      key: `preview-${slot.date}-${slot.time}`,
      date: slot.date,
      time: slot.time,
      durationMinutes,
      bayId: record?.bayId || 'NB',
      kind: isSelected ? 'proposed_selected' : 'proposed_placeholder',
      customerName: record?.customerName || undefined,
      vehicleLabel: overlayVehicleLabel(record) || undefined,
    }
  })
})

/** Remount grid subtree when switching layout so patch/block-tree does not cross wire different component types. */
const appointmentsMainPaneKey = computed(() =>
  activeView.value === 'calendar' ? `calendar:${calendarView.value}` : activeView.value
)
const selectedRecord = computed(() => records.value.find((record) => record.id === selectedRecordId.value) || null)
const isSchedulerOpen = ref(false)
const overflowRecords = computed(() =>
  visibleRecords.value
    .filter((record) => record.requestedDate === overflowDate.value)
    .sort((a, b) => a.requestedTime.localeCompare(b.requestedTime))
)

const parseIsoDate = (value: string): Date => {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return new Date()
  }
  return parsed
}

const getStartOfWeek = (date: Date): Date => {
  const start = new Date(date)
  const daysSinceMonday = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - daysSinceMonday)
  return start
}

const getViewRangeStartDate = (): string => {
  const selected = parseIsoDate(selectedDate.value)
  if (activeView.value === 'calendar') {
    if (calendarView.value === 'month') {
      return new Date(selected.getFullYear(), selected.getMonth(), 1).toISOString().slice(0, 10)
    }
    if (calendarView.value === 'week') {
      return getStartOfWeek(selected).toISOString().slice(0, 10)
    }
  }

  return selectedDate.value
}

const getRequestedStartDate = (): string => {
  const fromView = getViewRangeStartDate()
  const fromFilters = filters.value.dateFrom
  if (!fromFilters) {
    return fromView
  }
  return fromFilters < fromView ? fromFilters : fromView
}

function loadProposedOffers(): PendingProposedOffer[] {
  const raw = localStorage.getItem(PROPOSED_OFFERS_STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const token = typeof item.token === 'string' ? item.token : ''
        const recordId = typeof item.recordId === 'string' ? item.recordId : ''
        const bayId = typeof item.bayId === 'string' && item.bayId ? item.bayId : 'NB'
        const durationMinutes = Number(item.durationMinutes)
        const expiresAt = typeof item.expiresAt === 'string' ? item.expiresAt : ''
        const slotsRaw = Array.isArray(item.slots) ? item.slots : []
        if (!token || !recordId || !expiresAt || !Number.isFinite(durationMinutes) || durationMinutes <= 0) return null
        const slots = slotsRaw
          .map((slot: unknown) => {
            const date = typeof slot?.date === 'string' ? slot.date : ''
            const time = typeof slot?.time === 'string' ? slot.time : ''
            if (!date || !time) return null
            return { date, time }
          })
          .filter((slot: RescheduleSuggestionSlot | null): slot is RescheduleSuggestionSlot => Boolean(slot))
        if (!slots.length) return null
        return {
          token,
          recordId,
          bayId,
          durationMinutes: Math.max(30, durationMinutes),
          slots,
          expiresAt,
        }
      })
      .filter((offer): offer is PendingProposedOffer => Boolean(offer))
  } catch {
    return []
  }
}

const saveProposedOffers = (offers: PendingProposedOffer[]) => {
  localStorage.setItem(PROPOSED_OFFERS_STORAGE_KEY, JSON.stringify(offers))
}

const pruneExpiredProposedOffers = (offers: PendingProposedOffer[]): PendingProposedOffer[] => {
  const nowMs = Date.now()
  return offers.filter((offer) => {
    const expiresMs = new Date(offer.expiresAt).getTime()
    return Number.isFinite(expiresMs) && expiresMs > nowMs
  })
}

async function reconcileProposedOffers() {
  if (isReconcilingProposedOffers.value) return
  isReconcilingProposedOffers.value = true
  try {
    const pruned = pruneExpiredProposedOffers(activeProposedOffers.value)
    if (pruned.length !== activeProposedOffers.value.length) {
      activeProposedOffers.value = pruned
      saveProposedOffers(pruned)
    }
    if (!pruned.length) return
    const next: PendingProposedOffer[] = []
    for (const offer of pruned) {
      const status = await fetchAppointmentRescheduleOfferStatus(offer.token)
      if (!status.success) {
        if (!status.notFound) {
          next.push(offer)
        }
        continue
      }
      if (status.status === 'pending') {
        next.push({ ...offer, expiresAt: status.expiresAt || offer.expiresAt })
      }
    }
    activeProposedOffers.value = next
    saveProposedOffers(next)
  } finally {
    isReconcilingProposedOffers.value = false
  }
}

let refreshInFlight: Promise<void> | null = null
let refreshQueued = false
let refreshForcePos = false

const refreshRecords = async (options?: { forcePosRefresh?: boolean }) => {
  refreshForcePos = refreshForcePos || Boolean(options?.forcePosRefresh)
  if (refreshInFlight) {
    refreshQueued = true
    return refreshInFlight
  }
  const shouldForcePosRefresh = refreshForcePos
  refreshForcePos = false
  refreshInFlight = (async () => {
    const result = await listAppointments(filters.value, {
      requestedStartDate: getRequestedStartDate(),
      refreshPosCache: shouldForcePosRefresh,
    })
    records.value = result.records
    void reconcileProposedOffers()
  })().finally(() => {
    refreshInFlight = null
  })
  await refreshInFlight
  if (refreshQueued) {
    refreshQueued = false
    return refreshRecords({ forcePosRefresh: refreshForcePos })
  }
}

const syncReschedulesInBackground = () => {
  void applyPendingRescheduleOffersFromServer()
    .then((sync) => {
      if (sync.errors.length) {
        console.warn('[appointments] reschedule sync:', sync.errors.join('; '))
      }
      if (sync.applied > 0) {
        void refreshRecords()
      }
    })
    .catch((error) => {
      console.warn('[appointments] reschedule sync failed:', error)
    })
}

const handleManualRefresh = async () => {
  await refreshRecords({ forcePosRefresh: true })
  syncReschedulesInBackground()
}

watch(
  filters,
  () => {
    void refreshRecords()
  },
  { deep: true }
)
watch([activeView, calendarView, selectedDate], () => {
  void nextTick(() => {
    void refreshRecords()
  })
})

onMounted(() => {
  activeProposedOffers.value = pruneExpiredProposedOffers(activeProposedOffers.value)
  saveProposedOffers(activeProposedOffers.value)
  void reconcileProposedOffers()
  proposedOffersTimer = setInterval(() => {
    void reconcileProposedOffers()
  }, 30_000)
  void refreshRecords()
  syncReschedulesInBackground()
  window.addEventListener('mousedown', handleGlobalPointerDown)
  window.addEventListener('keydown', handleGlobalKeydown)
})

onBeforeUnmount(() => {
  if (proposedOffersTimer) {
    clearInterval(proposedOffersTimer)
    proposedOffersTimer = null
  }
  window.removeEventListener('mousedown', handleGlobalPointerDown)
  window.removeEventListener('keydown', handleGlobalKeydown)
})

const applyOptimisticMove = (id: string, next: { bayId: string; requestedDate: string; requestedTime: string }) => {
  const previous = records.value.find((item) => item.id === id)
  if (!previous) return null
  const bay = bayConfig.find((item) => item.bayId === next.bayId)
  records.value = records.value.map((item) =>
    item.id === id
      ? {
          ...item,
          bayId: next.bayId,
          bayName: bay?.bayName || item.bayName || 'No Bay',
          requestedDate: next.requestedDate,
          requestedTime: next.requestedTime,
        }
      : item
  )
  return previous
}

const restoreOptimisticMove = (snapshot: AppointmentRecord | null) => {
  if (!snapshot) return
  records.value = records.value.map((item) => (item.id === snapshot.id ? snapshot : item))
}

const { undoState, scheduleMove } = useAppointmentScheduler(refreshRecords, {
  applyOptimisticMove,
  restoreOptimisticMove,
})

const handleGlobalPointerDown = (event: MouseEvent) => {
  if (!createMenu.value.open) return
  const target = event.target as Node | null
  if (target && createMenuRef.value?.contains(target)) return
  closeCreateMenu()
}

const handleGlobalKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeCreateMenu()
  }
}

watch(
  () => filters.value.search,
  (value) => {
    if (value !== searchDraft.value) {
      searchDraft.value = value || ''
    }
  }
)

const updateSearchDraft = (search: string) => {
  searchDraft.value = search
}

const submitSearch = () => {
  filters.value = { ...filters.value, search: searchDraft.value.trim() }
}

const clearHeaderFilters = () => {
  const currentSearch = filters.value.search
  clearFilters()
  filters.value = { ...filters.value, search: currentSearch }
}

const jumpToToday = () => {
  selectedDate.value = new Date().toISOString().slice(0, 10)
}

const openDayFromMonth = (date: string) => {
  selectedDate.value = date
  calendarView.value = 'day'
}

const openDayOverflow = (date: string) => {
  overflowDate.value = date
  showDayOverflow.value = true
}

const openFromOverflow = (id: string) => {
  showDayOverflow.value = false
  openDrawer(id)
}

const openDrawer = (id: string) => {
  selectedRecordId.value = id
}

const openSchedulerModal = () => {
  isSchedulerOpen.value = true
}

const closeSchedulerModal = () => {
  isSchedulerOpen.value = false
}

const addDaysToIsoDate = (isoDate: string, deltaDays: number): string => {
  const d = parseIsoDate(isoDate)
  d.setDate(d.getDate() + deltaDays)
  return d.toISOString().slice(0, 10)
}

const moveRescheduleWeek = (direction: 1 | -1) => {
  const anchor = rescheduleSelectedDate.value || new Date().toISOString().slice(0, 10)
  rescheduleSelectedDate.value = addDaysToIsoDate(anchor, direction * 7)
}

const onRescheduleDateInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  if (!value) return
  rescheduleSelectedDate.value = value
}

const rescheduleSlotKey = (s: RescheduleSuggestionSlot) => `${s.date}|${s.time}`

const formatRescheduleSlotLabel = (s: RescheduleSuggestionSlot) => {
  const [y, m, d] = s.date.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const datePart = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return `${datePart} · ${formatTimeLabel(s.time)}`
}

const rescheduleSlotSelected = (s: RescheduleSuggestionSlot) =>
  rescheduleSelectedSlots.value.some((x) => rescheduleSlotKey(x) === rescheduleSlotKey(s))

const addRescheduleSlot = (s: RescheduleSuggestionSlot) => {
  if (rescheduleSelectedSlots.value.length >= 3) return
  if (rescheduleSlotSelected(s)) return
  rescheduleSelectedSlots.value = [...rescheduleSelectedSlots.value, { ...s }]
}

const removeRescheduleSlot = (s: RescheduleSuggestionSlot) => {
  const k = rescheduleSlotKey(s)
  rescheduleSelectedSlots.value = rescheduleSelectedSlots.value.filter((x) => rescheduleSlotKey(x) !== k)
}

const closeReschedulePicker = () => {
  showReschedulePicker.value = false
  rescheduleTargetId.value = null
  rescheduleMintError.value = ''
  isRescheduleSuggestionsLoading.value = false
}

const openRescheduleFlow = async (id: string) => {
  const record = records.value.find((r) => r.id === id)
  if (!record) return
  rescheduleTargetId.value = id
  rescheduleSelectedDate.value = record.requestedDate
  rescheduleSelectedSlots.value = []
  rescheduleSuggestions.value = []
  rescheduleMintError.value = ''
  reschedulePendingSendOffer.value = null
  showReschedulePicker.value = true
  isRescheduleSuggestionsLoading.value = true
  void buildRescheduleSuggestions(record)
    .then((suggestions) => {
      if (rescheduleTargetId.value === id) {
        rescheduleSuggestions.value = suggestions
      }
    })
    .finally(() => {
      if (rescheduleTargetId.value === id) {
        isRescheduleSuggestionsLoading.value = false
      }
    })
}

const onRescheduleCalendarPick = (payload: SlotCreatePayload) => {
  const requestedTime = normalizeSlotStartTime(payload.baseTime, payload.startTime)
  if (!isFutureRescheduleSlot(payload.date, requestedTime)) {
    void alertAnchored({ message: 'Choose a future date and time.' })
    return
  }
  if (!isShopOpenSlot(requestedTime)) {
    void alertAnchored({ message: 'Choose a time during shop hours only.' })
    return
  }
  const slot = { date: payload.date, time: requestedTime }
  if (rescheduleSlotSelected(slot)) {
    removeRescheduleSlot(slot)
    return
  }
  addRescheduleSlot(slot)
}

const goRescheduleMintAndSendDialog = async () => {
  rescheduleMintError.value = ''
  const id = rescheduleTargetId.value
  const record = id ? records.value.find((r) => r.id === id) : undefined
  if (!record || rescheduleSelectedSlots.value.length === 0) {
    void alertAnchored({ message: 'Select at least one date and time (up to 3).' })
    return
  }
  rescheduleMinting.value = true
  try {
    const mint = await mintAppointmentRescheduleOffer({
      recordId: record.id,
      storeId: String(getSelectedStoreNum()),
      shopName: rescheduleShopName.value,
      bayId: record.bayId || 'NB',
      durationMinutes: record.requestedDuration,
      slots: rescheduleSelectedSlots.value,
      customerName: record.customerName,
      customerPhone: record.customerPhone,
    })
    if (!mint.success) {
      rescheduleMintError.value = mint.error
      await alertAnchored({ message: mint.error })
      return
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${origin}/appointments/reschedule?token=${encodeURIComponent(mint.token)}`
    reschedulePublicUrl.value = url
    rescheduleCustomerPhone.value = record.customerPhone || ''
    const name = record.customerName.trim() || 'there'
    const lines = rescheduleSelectedSlots.value.map((s) => `• ${formatRescheduleSlotLabel(s)}`).join('\n')
    rescheduleSmsMessage.value = `Hi ${name},\n\nPlease reschedule using this link (tap one of the times):\n${url}\n\nOptions:\n${lines}\n\nThank you.`
    reschedulePendingSendOffer.value = {
      token: mint.token,
      recordId: record.id,
      bayId: record.bayId || 'NB',
      durationMinutes: Math.max(30, record.requestedDuration),
      slots: rescheduleSelectedSlots.value.map((slot) => ({ ...slot })),
      expiresAt: mint.expiresAt,
    }
    showReschedulePicker.value = false
    showRescheduleSend.value = true
  } finally {
    rescheduleMinting.value = false
  }
}

const onRescheduleSmsSent = async () => {
  if (reschedulePendingSendOffer.value) {
    const merged = pruneExpiredProposedOffers([
      ...activeProposedOffers.value.filter((offer) => offer.token !== reschedulePendingSendOffer.value?.token),
      reschedulePendingSendOffer.value,
    ])
    activeProposedOffers.value = merged
    saveProposedOffers(merged)
    reschedulePendingSendOffer.value = null
  }
  void reconcileProposedOffers()
  void refreshRecords()
  syncReschedulesInBackground()
}

function toSmsPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length > 8) return `+${digits}`
  return null
}

function formatLongDateForSms(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

const sendAppointmentConfirmationSms = async (record: AppointmentRecord) => {
  const raw = (record.customerPhone || '').trim()
  if (!raw) return
  const phone = toSmsPhone(raw)
  if (!phone) {
    await alertAnchored({ message: 'Customer phone is missing or invalid for SMS.' })
    return
  }
  const body = `Your appointment is confirmed for ${formatLongDateForSms(record.requestedDate)} at ${formatTimeLabel(record.requestedTime)}. We look forward to seeing you.`
  const result = await sendChatMessage({ phone, body, channel: 'sms' })
  if (!result.success) {
    await alertAnchored({ message: result.error || 'Failed to send confirmation SMS' })
  }
}

const normalizeSlotStartTime = (baseTime: string, startTime: string) => {
  const baseHour = Number(baseTime.split(':')[0] || '0')
  const safeHour = Number.isFinite(baseHour) ? Math.max(0, Math.min(23, baseHour)) : 0
  const minutesInHour = toMinutes(startTime) % 60
  const snappedMinutes = minutesInHour >= 30 ? '30' : '00'
  return `${safeHour.toString().padStart(2, '0')}:${snappedMinutes}`
}

const createPlaceholderAppointment = async (payload: { date: string; baseTime: string; startTime: string; bayId?: string }) => {
  const requestedTime = normalizeSlotStartTime(payload.baseTime, payload.startTime)
  if (!isShopOpenSlot(requestedTime)) {
    window.alert('Appointments can only be scheduled during shop hours (7:00 AM – 7:00 PM).')
    return
  }
  const bayId = payload.bayId || 'NB'
  const bay = bayConfig.find((item) => item.bayId === bayId)
  const created = await createAppointmentRecord({
    accountId: 'default',
    storeId: '3',
    customerName: '',
    sendText: false,
    sendEmail: false,
    recordType: 'booked_unconfirmed',
    status: 'unconfirmed',
    requestedDate: payload.date,
    requestedTime,
    requestedDuration: 60,
    bayId,
    bayName: bay?.bayName || 'No Bay',
    note: '',
    createdBy: 'Staff',
    posFlag: false,
    apiSubmitted: false,
  })

  records.value = [...records.value, created]
  placeholderRecordIds.value = [...placeholderRecordIds.value, created.id]
  selectedDate.value = payload.date
  openDrawer(created.id)
  void refreshRecords()
  syncReschedulesInBackground()
}

const openCreateMenu = (payload: {
  source: CreateSource
  trigger: CreateMenuTrigger
  clientX: number
  clientY: number
  slot: { date: string; baseTime?: string; startTime?: string; bayId?: string } | null
}) => {
  const panelWidth = 192
  const slotTime =
    payload.trigger === 'timeslot'
      ? payload.slot?.startTime ?? payload.slot?.baseTime ?? null
      : null
  const timeslotOutsideShop =
    payload.trigger === 'timeslot' && Boolean(slotTime && !isShopOpenSlot(slotTime))
  const options: CreateIntent[] =
    payload.trigger === 'timeslot'
      ? timeslotOutsideShop
        ? ['quick_note', 'schedule_note']
        : ['quick_note', 'schedule_note', 'appointment']
      : ['quick_note', 'schedule_note']
  const panelHeight = payload.trigger === 'timeslot' ? (options.length === 2 ? 88 : 122) : 88
  createMenu.value = {
    open: true,
    source: payload.source,
    trigger: payload.trigger,
    top: Math.min(payload.clientY + 8, window.innerHeight - panelHeight - 16),
    left: clampPopoverLeft(payload.clientX, panelWidth, 16),
    options,
    slot: payload.slot,
  }
}

const closeCreateMenu = () => {
  createMenu.value.open = false
}

const openCreateMenuForCalendarSlot = (payload: SlotCreatePayload) => {
  openCreateMenu({
    source: 'calendar',
    trigger: 'timeslot',
    clientX: payload.clientX,
    clientY: payload.clientY,
    slot: {
      date: payload.date,
      baseTime: payload.baseTime,
      startTime: payload.startTime,
    },
  })
}

const openCreateMenuForBaySlot = (payload: SlotCreatePayload) => {
  openCreateMenu({
    source: 'bay',
    trigger: 'timeslot',
    clientX: payload.clientX,
    clientY: payload.clientY,
    slot: {
      date: payload.date,
      baseTime: payload.baseTime,
      startTime: payload.startTime,
      bayId: payload.bayId,
    },
  })
}

const openCreateMenuForDayNote = (source: CreateSource, payload: DayNotePayload) => {
  openCreateMenu({
    source,
    trigger: 'day_notes',
    clientX: payload.clientX,
    clientY: payload.clientY,
    slot: {
      date: payload.date,
      bayId: payload.bayId,
    },
  })
}

const getCreateIntentLabel = (intent: CreateIntent): string => {
  if (intent === 'quick_note') return 'Quick note'
  if (intent === 'schedule_note') return 'Schedule note'
  return 'Appointment'
}

const selectCreateMenuIntent = async (intent: CreateIntent) => {
  const menuState = createMenu.value
  closeCreateMenu()
  if (!menuState.slot) return
  if (intent === 'appointment') {
    if (!menuState.slot.baseTime || !menuState.slot.startTime) return
    await createPlaceholderAppointment({
      date: menuState.slot.date,
      baseTime: menuState.slot.baseTime,
      startTime: menuState.slot.startTime,
      bayId: menuState.slot.bayId,
    })
    return
  }
  openCreateRecordFromIntent(intent, menuState.source, menuState.slot.date, menuState.slot.startTime, menuState.slot.bayId)
}

const getRecordValidationError = (patch: Partial<AppointmentRecord>): string | null => {
  const recordType = patch.recordType
  if (!recordType) {
    return 'Record type is required.'
  }
  if (requiresCustomerNameForRecordType(recordType) && !(patch.customerName || '').trim()) {
    return 'Customer name is required for appointments.'
  }
  if (requiresScheduleBlockerTypeForRecordType(recordType) && !patch.scheduleBlockerType) {
    return 'Schedule blocker type is required for schedule notes.'
  }
  return null
}

const onDragStart = (id: string) => {
  draggingRecordId.value = id
}

const onDragEnd = () => {
  draggingRecordId.value = null
}

const isAppointmentRecordForShopHours = (record: AppointmentRecord) =>
  record.recordType === 'booked_unconfirmed' || record.recordType === 'confirmed'

const onCalendarDrop = async (target: { date: string; time: string }) => {
  if (!draggingRecordId.value) return
  const record = records.value.find((item) => item.id === draggingRecordId.value)
  draggingRecordId.value = null
  if (!record) return
  if (isAppointmentRecordForShopHours(record) && !isShopOpenSlot(target.time)) {
    window.alert('Appointments cannot be moved outside shop hours (7:00 AM – 7:00 PM).')
    return
  }
  await scheduleMove(record, {
    bayId: record.bayId || 'NB',
    requestedDate: target.date,
    requestedTime: target.time,
  })
}

const onBayDrop = async (target: { bayId: string; date: string; time: string }) => {
  if (!draggingRecordId.value) return
  const record = records.value.find((item) => item.id === draggingRecordId.value)
  draggingRecordId.value = null
  if (!record) return
  if (isAppointmentRecordForShopHours(record) && !isShopOpenSlot(target.time)) {
    window.alert('Appointments cannot be moved outside shop hours (7:00 AM – 7:00 PM).')
    return
  }
  const result = await scheduleMove(record, {
    bayId: target.bayId,
    requestedDate: target.date,
    requestedTime: target.time,
  })
  if (!result.success && result.reason) {
    await alertAnchored({ message: result.reason })
  }
}

const saveRecord = async (payload: { id: string; patch: Partial<AppointmentRecord> }) => {
  const existingRecord = records.value.find((record) => record.id === payload.id)
  if (!existingRecord) return
  const validationError = getRecordValidationError(payload.patch)
  if (validationError) {
    // Anchor: last pointer or active element when not passed from drawer.
    await alertAnchored({ message: validationError })
    return
  }
  const nextRecord = { ...existingRecord, ...payload.patch }
  if (nextRecord.recordType === 'confirmed') {
    const canSaveInSlot = await canDropInBaySlot({
      bayId: nextRecord.bayId || 'NB',
      date: nextRecord.requestedDate,
      requestedTime: nextRecord.requestedTime,
      duration: nextRecord.requestedDuration,
      movingRecordId: payload.id,
      targetRecordType: 'confirmed',
    })
    if (!canSaveInSlot) {
      await alertAnchored({
        message: 'This confirmed appointment conflicts with a schedule blocker in that time slot.',
      })
      return
    }
  }
  const previousRecord = { ...existingRecord }
  records.value = records.value.map((record) => (record.id === payload.id ? { ...record, ...payload.patch } : record))
  placeholderRecordIds.value = placeholderRecordIds.value.filter((id) => id !== payload.id)
  if (selectedRecordId.value === payload.id) {
    selectedRecordId.value = null
  }
  void updateAppointmentRecord(payload.id, payload.patch, { syncIcal: true })
    .then((updated) => {
      if (!updated) {
        if (Object.keys(payload.patch).length === 1 && typeof payload.patch.colorOverride === 'string') {
          setAppointmentRecordColorOverride(payload.id, payload.patch.colorOverride)
          void refreshRecords()
          return
        }
        throw new Error('Appointment record was not found while saving.')
      }
      void refreshRecords()
      syncReschedulesInBackground()
    })
    .catch(async (error) => {
      records.value = records.value.map((record) => (record.id === payload.id ? previousRecord : record))
      await alertAnchored({ message: error instanceof Error ? error.message : 'Failed to save appointment changes.' })
    })
}

const getColorScopeLabel = (recordType: AppointmentRecordType): string => {
  switch (recordType) {
    case 'confirmed':
      return 'confirmed appointment'
    case 'booked_unconfirmed':
      return 'unconfirmed appointment'
    case 'quick_note':
      return 'quick note'
    case 'schedule_note':
      return 'schedule note'
    default:
      return 'selected'
  }
}

const handleColorChangeRequest = async (payload: {
  recordId: string
  colorKey: AppointmentBlockColorKey
  recordType: AppointmentRecordType
  anchor?: MouseEvent
}) => {
  const targetRecord = records.value.find((record) => record.id === payload.recordId)
  if (!targetRecord) return

  const applyToAll = await confirmAnchored({
    message: `Apply this color to all ${getColorScopeLabel(payload.recordType)} blocks? Click Cancel to apply to only this block.`,
    anchor: payload.anchor,
    preferenceKey: 'appointments.blockColorScope',
    confirmLabel: 'Apply to all',
    cancelLabel: 'Only this block',
  })

  const previousRecords = records.value.map((record) => ({ ...record }))
  const targetType = getColorScopeTypeForRecordType(payload.recordType)
  const recordIdsToUpdate = applyToAll
    ? records.value.filter((record) => getColorScopeTypeForRecordType(record.recordType) === targetType).map((record) => record.id)
    : [payload.recordId]

  records.value = records.value.map((record) =>
    recordIdsToUpdate.includes(record.id)
      ? { ...record, colorOverride: applyToAll ? undefined : payload.colorKey }
      : record
  )

  try {
    if (applyToAll) {
      await applyColorToAllRecordsOfType(payload.recordType, payload.colorKey)
      recordIdsToUpdate.forEach((id) => setAppointmentRecordColorOverride(id, undefined))
    } else {
      const updated = await updateAppointmentRecord(payload.recordId, { colorOverride: payload.colorKey }, { syncIcal: true })
      if (!updated) {
        setAppointmentRecordColorOverride(payload.recordId, payload.colorKey)
      }
    }
  } catch (error) {
    records.value = previousRecords
    await alertAnchored({ message: error instanceof Error ? error.message : 'Failed to save block color.' })
    return
  }

  void refreshRecords()
}

const removeRecord = async (id: string) => {
  const previousRecords = records.value
  records.value = records.value.filter((record) => record.id !== id)
  placeholderRecordIds.value = placeholderRecordIds.value.filter((placeholderId) => placeholderId !== id)
  if (selectedRecordId.value === id) {
    selectedRecordId.value = null
  }
  void deleteAppointmentRecord(id, { syncIcal: true })
    .then((deleted) => {
      if (!deleted) {
        throw new Error('Appointment record was not found while deleting.')
      }
      void refreshRecords()
      syncReschedulesInBackground()
    })
    .catch(async (error) => {
      records.value = previousRecords
      await alertAnchored({ message: error instanceof Error ? error.message : 'Failed to delete appointment.' })
    })
}

const confirmRecord = async (id: string) => {
  const record = records.value.find((item) => item.id === id)
  if (!record) return
  const canConfirmInSlot = await canDropInBaySlot({
    bayId: record.bayId || 'NB',
    date: record.requestedDate,
    requestedTime: record.requestedTime,
    duration: record.requestedDuration,
    movingRecordId: record.id,
    targetRecordType: 'confirmed',
  })
  if (!canConfirmInSlot) {
    await alertAnchored({
      message: 'This appointment conflicts with a schedule blocker and cannot be confirmed in this time slot.',
    })
    return
  }
  const previousRecord = { ...record }
  records.value = records.value.map((item) =>
    item.id === id ? { ...item, recordType: 'confirmed', status: 'confirmed' as AppointmentStatus } : item
  )
  void confirmAppointmentRecord(id, 'Staff', { syncIcal: true })
    .then((updated) => {
      if (!updated) {
        throw new Error('Appointment record was not found while confirming.')
      }
      void refreshRecords()
      syncReschedulesInBackground()
      void sendAppointmentConfirmationSms(updated)
    })
    .catch(async (error) => {
      records.value = records.value.map((item) => (item.id === id ? previousRecord : item))
      await alertAnchored({ message: error instanceof Error ? error.message : 'Failed to confirm appointment.' })
    })
}

const createDraft = ref({
  customerName: '',
  recordType: 'booked_unconfirmed' as AppointmentRecordType,
  status: 'unconfirmed' as AppointmentStatus,
  scheduleBlockerType: '' as ScheduleNoteBlockerType | '',
  bayId: 'NB',
  requestedDate: selectedDate.value,
  requestedTime: '09:00',
  requestedDuration: 60,
  note: '',
})

const normalizeRequestedDuration = (value: number) => normalizeDuration(value)

const setCreateDurationFromParts = (hours: number, minutes: number) => {
  createDraft.value.requestedDuration = normalizeRequestedDuration(toTotalMinutes(hours, minutes))
}

const createDurationParts = computed(() => toDurationParts(createDraft.value.requestedDuration))

const createDurationHours = computed({
  get: () => createDurationParts.value.hours,
  set: (value: number) => {
    setCreateDurationFromParts(value, createDurationParts.value.minutes)
  },
})

const createDurationMinutes = computed({
  get: () => createDurationParts.value.minutes,
  set: (value: number) => {
    setCreateDurationFromParts(createDurationParts.value.hours, value)
  },
})

const statusOptions: AppointmentStatus[] = ['confirmed', 'unconfirmed']
const appointmentStatusLabel = (status: AppointmentStatus) => (status === 'confirmed' ? 'Confirmed' : 'Unconfirmed')
const isQuickNoteDraft = computed(() => createDraft.value.recordType === 'quick_note')
const isScheduleNoteDraft = computed(() => createDraft.value.recordType === 'schedule_note')
const isAppointmentDraft = computed(
  () => createDraft.value.recordType === 'booked_unconfirmed' || createDraft.value.recordType === 'confirmed'
)
const createModalTitle = computed(() => {
  if (isQuickNoteDraft.value) return 'New Quick Note'
  if (isScheduleNoteDraft.value) return 'New Schedule Note'
  return 'New Appointment'
})
const createValidationMessage = computed(() =>
  getRecordValidationError({
    recordType: createDraft.value.recordType,
    customerName: createDraft.value.customerName,
    scheduleBlockerType: createDraft.value.scheduleBlockerType || undefined,
  })
)
const hasAllowedScheduleBlockerType = computed(() =>
  scheduleNoteBlockerOptions.value.includes(createDraft.value.scheduleBlockerType as ScheduleNoteBlockerType)
)
const createDraftValidationMessage = computed(() => {
  if (createValidationMessage.value) {
    return createValidationMessage.value
  }
  if (isScheduleNoteDraft.value && !hasAllowedScheduleBlockerType.value) {
    return 'Schedule blocker type must match the current view.'
  }
  return null
})

watch(
  () => [createDraft.value.recordType, createSource.value] as const,
  () => {
    if (createDraft.value.recordType !== 'schedule_note') {
      createDraft.value.scheduleBlockerType = ''
    } else if (!scheduleNoteBlockerOptions.value.includes(createDraft.value.scheduleBlockerType as ScheduleNoteBlockerType)) {
      createDraft.value.scheduleBlockerType = scheduleNoteBlockerOptions.value[0]
    }
  },
  { immediate: true }
)

const resolveCreateSource = (source?: CreateSource): CreateSource => {
  if (source) return source
  return activeView.value === 'bay' ? 'bay' : 'calendar'
}

const quickNoteDraft = ref({
  customerName: '',
  requestedDate: selectedDate.value,
  requestedTime: '09:00',
  requestedDuration: 60,
  note: '',
})
const quickNoteBayId = ref('NB')

const scheduleNoteDraft = ref({
  customerName: '',
  scheduleBlockerType: '' as ScheduleNoteBlockerType | '',
  bayId: 'NB',
  requestedDate: selectedDate.value,
  requestedTime: '09:00',
  requestedDuration: 60,
  note: '',
})

const openCreateRecord = (
  recordType: AppointmentRecordType = 'booked_unconfirmed',
  source?: CreateSource,
  requestedDate?: string,
  requestedTime?: string,
  bayId?: string
) => {
  createSource.value = resolveCreateSource(source)
  createDraft.value = {
    customerName: '',
    recordType,
    status: 'unconfirmed',
    scheduleBlockerType: '',
    bayId: bayId || 'NB',
    requestedDate: requestedDate || selectedDate.value,
    requestedTime: requestedTime || '09:00',
    requestedDuration: 60,
    note: '',
  }
  showCreateModal.value = true
}

const openCreateRecordFromIntent = (
  intent: CreateIntent,
  source?: CreateSource,
  requestedDate?: string,
  requestedTime?: string,
  bayId?: string
) => {
  const resolvedSource = resolveCreateSource(source)
  createSource.value = resolvedSource
  if (intent === 'quick_note') {
    quickNoteBayId.value = bayId || 'NB'
    quickNoteDraft.value = {
      customerName: '',
      requestedDate: requestedDate || selectedDate.value,
      requestedTime: requestedTime || '09:00',
      requestedDuration: 60,
      note: '',
    }
    showQuickNoteDrawer.value = true
    return
  }
  if (intent === 'schedule_note') {
    const initialBlocker = scheduleNoteBlockerOptionsBySource[resolvedSource][0]
    scheduleNoteDraft.value = {
      customerName: '',
      scheduleBlockerType: initialBlocker,
      bayId: bayId || 'NB',
      requestedDate: requestedDate || selectedDate.value,
      requestedTime: requestedTime || '09:00',
      requestedDuration: 60,
      note: '',
    }
    showScheduleNoteDrawer.value = true
    return
  }
  openCreateRecord('booked_unconfirmed', resolvedSource, requestedDate, requestedTime, bayId)
}

const resolveRecordStatus = (recordType: AppointmentRecordType, status: AppointmentStatus): AppointmentStatus => {
  if (recordType === 'confirmed') return 'confirmed'
  if (recordType === 'booked_unconfirmed') return 'unconfirmed'
  return status
}

const createRecordForType = async (recordType: AppointmentRecordType) => {
  const selectedScheduleBlockerType =
    recordType === 'schedule_note' ? (createDraft.value.scheduleBlockerType as ScheduleNoteBlockerType) : undefined

  if (
    recordType === 'schedule_note' &&
    (!selectedScheduleBlockerType || !scheduleNoteBlockerOptions.value.includes(selectedScheduleBlockerType))
  ) {
    await alertAnchored({ message: 'Schedule blocker type must match the current view.' })
    return
  }

  const validationError = getRecordValidationError({
    recordType,
    customerName: createDraft.value.customerName,
    scheduleBlockerType: selectedScheduleBlockerType,
  })
  if (validationError) {
    await alertAnchored({ message: validationError })
    return
  }
  const isShopCloseNote = recordType === 'schedule_note' && createDraft.value.scheduleBlockerType === 'shop_close'
  const effectiveBayId = isShopCloseNote ? 'NB' : createDraft.value.bayId
  const bay = bayConfig.find((item) => item.bayId === effectiveBayId)
  if (recordType === 'confirmed') {
    const canCreateInSlot = await canDropInBaySlot({
      bayId: effectiveBayId,
      date: createDraft.value.requestedDate,
      requestedTime: createDraft.value.requestedTime,
      duration: normalizeRequestedDuration(createDraft.value.requestedDuration),
      targetRecordType: 'confirmed',
    })
    if (!canCreateInSlot) {
      await alertAnchored({
        message: 'Confirmed appointments cannot be created in a slot blocked by a schedule note.',
      })
      return
    }
  }
  await createAppointmentRecord({
    accountId: 'default',
    storeId: '3',
    customerName: createDraft.value.customerName.trim(),
    sendText: false,
    sendEmail: false,
    recordType,
    scheduleBlockerType: selectedScheduleBlockerType,
    status: resolveRecordStatus(recordType, createDraft.value.status),
    requestedDate: createDraft.value.requestedDate,
    requestedTime: createDraft.value.requestedTime,
    requestedDuration: normalizeRequestedDuration(createDraft.value.requestedDuration),
    bayId: effectiveBayId,
    bayName: isShopCloseNote ? 'Shop' : bay?.bayName || 'No Bay',
    note: createDraft.value.note,
    createdBy: 'Staff',
    posFlag: false,
    apiSubmitted: false,
  }, { syncIcal: true })
  showCreateModal.value = false
  void refreshRecords()
  syncReschedulesInBackground()
}

const saveCreateDraft = async () => {
  await createRecordForType(createDraft.value.recordType)
}

const createAppointmentFromQuickNoteDraft = async () => {
  await createRecordForType('booked_unconfirmed')
}

const saveQuickNoteDraft = async (draft: {
  customerName: string
  requestedDate: string
  requestedTime: string
  requestedDuration: number
  note: string
}) => {
  const effectiveBayId = quickNoteBayId.value || 'NB'
  const bay = bayConfig.find((item) => item.bayId === effectiveBayId)
  await createAppointmentRecord({
    accountId: 'default',
    storeId: '3',
    customerName: draft.customerName.trim(),
    sendText: false,
    sendEmail: false,
    recordType: 'quick_note',
    status: 'unconfirmed',
    requestedDate: draft.requestedDate,
    requestedTime: draft.requestedTime,
    requestedDuration: normalizeRequestedDuration(draft.requestedDuration),
    bayId: effectiveBayId,
    bayName: bay?.bayName || 'No Bay',
    note: draft.note,
    createdBy: 'Staff',
    posFlag: false,
    apiSubmitted: false,
  }, { syncIcal: true })
  showQuickNoteDrawer.value = false
  void refreshRecords()
  syncReschedulesInBackground()
}

const createAppointmentFromQuickNoteDrawer = async (draft: {
  customerName: string
  requestedDate: string
  requestedTime: string
  requestedDuration: number
  note: string
}) => {
  showQuickNoteDrawer.value = false
  openCreateRecord('booked_unconfirmed', createSource.value, draft.requestedDate, draft.requestedTime, quickNoteBayId.value)
  createDraft.value.customerName = draft.customerName
  createDraft.value.note = draft.note
  createDraft.value.requestedDuration = normalizeRequestedDuration(draft.requestedDuration)
}

const saveScheduleNoteDraft = async (draft: {
  customerName: string
  scheduleBlockerType: ScheduleNoteBlockerType
  bayId: string
  requestedDate: string
  requestedTime: string
  requestedDuration: number
  note: string
}) => {
  if (!scheduleNoteBlockerOptions.value.includes(draft.scheduleBlockerType)) {
    await alertAnchored({ message: 'Schedule blocker type must match the current view.' })
    return
  }
  const isShopCloseNote = draft.scheduleBlockerType === 'shop_close'
  const effectiveBayId = isShopCloseNote ? 'NB' : draft.bayId
  const bay = bayConfig.find((item) => item.bayId === effectiveBayId)
  await createAppointmentRecord({
    accountId: 'default',
    storeId: '3',
    customerName: draft.customerName.trim(),
    sendText: false,
    sendEmail: false,
    recordType: 'schedule_note',
    scheduleBlockerType: draft.scheduleBlockerType,
    status: 'unconfirmed',
    requestedDate: draft.requestedDate,
    requestedTime: draft.requestedTime,
    requestedDuration: normalizeRequestedDuration(draft.requestedDuration),
    bayId: effectiveBayId,
    bayName: isShopCloseNote ? 'Shop' : bay?.bayName || 'No Bay',
    note: draft.note,
    createdBy: 'Staff',
    posFlag: false,
    apiSubmitted: false,
  }, { syncIcal: true })
  showScheduleNoteDrawer.value = false
  void refreshRecords()
  syncReschedulesInBackground()
}

const resolveBlackoutRangeMinutes = (payload: { startTime: string; endTimeExclusive: string }) => {
  const start = toMinutes(payload.startTime)
  const end = toMinutes(payload.endTimeExclusive)
  if (end <= start) {
    return { start, end: start + 30 }
  }
  return { start, end }
}

const hasBayBlockerOverlap = (payload: { bayId: string; date: string; startTime: string; endTimeExclusive: string }) => {
  const candidate = resolveBlackoutRangeMinutes(payload)
  return records.value.some((record) => {
    if (record.recordType !== 'schedule_note' || record.scheduleBlockerType !== 'bay_blocker') return false
    if ((record.bayId || 'NB') !== payload.bayId || record.requestedDate !== payload.date) return false
    const blockerStart = toMinutes(record.requestedTime)
    const blockerEnd = blockerStart + record.requestedDuration
    return blockerStart < candidate.end && blockerEnd > candidate.start
  })
}

const createBlackout = async (payload: { bayId: string; date: string; startTime: string; endTimeExclusive: string }) => {
  if (hasBayBlockerOverlap(payload)) {
    await alertAnchored({ message: 'This bay blocker overlaps an existing bay blocker.' })
    return
  }
  const range = resolveBlackoutRangeMinutes(payload)
  const bay = bayConfig.find((item) => item.bayId === payload.bayId)
  await createAppointmentRecord({
    accountId: 'default',
    storeId: '3',
    customerName: `Block ${bay?.bayName || payload.bayId}`,
    sendText: false,
    sendEmail: false,
    recordType: 'schedule_note',
    scheduleBlockerType: 'bay_blocker',
    status: 'unconfirmed',
    requestedDate: payload.date,
    requestedTime: payload.startTime,
    requestedDuration: range.end - range.start,
    bayId: payload.bayId,
    bayName: bay?.bayName || payload.bayId,
    note: 'Bay blackout',
    createdBy: 'Staff',
    posFlag: false,
    apiSubmitted: false,
  }, { syncIcal: true })
  void refreshRecords()
  syncReschedulesInBackground()
}

const runUndo = async () => {
  if (undoState.value.undo) {
    await undoState.value.undo()
  }
}

const isPlaceholderRecord = (id: string) => placeholderRecordIds.value.includes(id)

const isUntouchedPlaceholder = (record: AppointmentRecord) =>
  isPlaceholderRecord(record.id) &&
  record.customerName.trim() === '' &&
  record.recordType === 'booked_unconfirmed' &&
  record.status === 'unconfirmed' &&
  record.requestedDuration === 60 &&
  (record.note || '') === ''

const isBlankPlaceholderSnapshot = (
  record: AppointmentRecord,
  patch: Partial<AppointmentRecord> | null
) => {
  if (!isPlaceholderRecord(record.id)) return false
  const snapshot = patch ? ({ ...record, ...patch } as AppointmentRecord) : record
  const vehicle = snapshot.vehicle || {}
  const hasVehicleInput = Boolean(
    (vehicle.year || '').trim() ||
      (vehicle.make || '').trim() ||
      (vehicle.model || '').trim() ||
      (vehicle.vin || '').trim() ||
      (vehicle.licensePlate || '').trim() ||
      (vehicle.tagState || '').trim()
  )
  return (
    snapshot.recordType === 'booked_unconfirmed' &&
    snapshot.status === 'unconfirmed' &&
    snapshot.customerName.trim() === '' &&
    !(snapshot.customerPhone || '').trim() &&
    !(snapshot.customerEmail || '').trim() &&
    !(snapshot.note || '').trim() &&
    !hasVehicleInput
  )
}

const handleDrawerAttemptClose = async (payload: {
  source: 'overlay' | 'button'
  hasChanges: boolean
  patch: Partial<AppointmentRecord> | null
  anchor?: MouseEvent
}) => {
  const record = selectedRecord.value
  if (!record) {
    selectedRecordId.value = null
    return
  }

  if (isBlankPlaceholderSnapshot(record, payload.patch)) {
    await removeRecord(record.id)
    return
  }

  if (!payload.hasChanges && payload.source === 'overlay' && isUntouchedPlaceholder(record)) {
    await removeRecord(record.id)
    return
  }

  if (!payload.hasChanges) {
    selectedRecordId.value = null
    return
  }

  const saveBeforeClosing = await confirmAnchored({
    message:
      'You have unsaved appointment changes. Click OK to save before closing, or Cancel to discard changes and close.',
    anchor: payload.anchor,
    preferenceKey: 'appointments.unsavedCloseDrawer',
    confirmLabel: 'Save',
    cancelLabel: 'Discard and close',
  })

  if (saveBeforeClosing && payload.patch) {
    const validationError = getRecordValidationError(payload.patch)
    if (validationError) {
      await alertAnchored({ message: validationError, anchor: payload.anchor })
      return
    }
    await saveRecord({ id: record.id, patch: payload.patch })
  } else if (isUntouchedPlaceholder(record)) {
    await removeRecord(record.id)
    return
  }

  selectedRecordId.value = null
}

function loadShellState(): Partial<{ activeView: ViewMode; calendarView: CalendarMode; selectedDate: string }> {
  const raw = localStorage.getItem(SHELL_STORAGE_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}
</script>
