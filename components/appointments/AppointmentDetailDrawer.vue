<template>
  <div v-if="record && draft" class="fixed inset-0 z-50">
    <div class="absolute inset-0 bg-black/20" @click="requestClose('overlay', $event)" />
    <aside class="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white p-4 shadow-xl">
      <div class="mb-4 flex items-start justify-between">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">{{ recordTitle }}</h2>
          <div v-if="isAppointmentRecord" class="mt-2 flex flex-wrap items-center gap-2">
            <span class="text-xs text-slate-500">Booking status</span>
            <span
              class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
              :class="
                record.recordType === 'confirmed'
                  ? 'border-blue-200 bg-blue-50 text-blue-900'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              "
            >
              {{ record.recordType === 'confirmed' ? 'Confirmed' : 'Unconfirmed' }}
            </span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
            @click="showColorSettings = !showColorSettings"
          >
            Settings
          </button>
          <button type="button" class="rounded border px-2 py-1 text-xs" @click="requestClose('button', $event)">Close</button>
        </div>
      </div>

      <div
        v-if="isAppointmentRecord"
        class="mb-3 flex rounded-md border border-slate-200 bg-slate-100/80 p-0.5"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          :aria-selected="drawerTab === 'appointment'"
          class="flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors"
          :class="
            drawerTab === 'appointment'
              ? 'border border-slate-800 bg-slate-900 text-white shadow-sm'
              : 'border border-transparent text-slate-600 hover:text-slate-900'
          "
          @click="drawerTab = 'appointment'"
        >
          Appointment
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="drawerTab === 'ticket'"
          class="flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors"
          :class="
            drawerTab === 'ticket'
              ? 'border border-slate-800 bg-slate-900 text-white shadow-sm'
              : 'border border-transparent text-slate-600 hover:text-slate-900'
          "
          @click="drawerTab = 'ticket'"
        >
          Ticket
        </button>
      </div>

      <div v-show="!isAppointmentRecord || drawerTab === 'appointment'" class="space-y-3">
        <div v-if="showColorSettings" class="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p class="mb-2 text-xs font-medium text-slate-700">Block color</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="option in colorOptions"
              :key="option.key"
              type="button"
              class="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
              :class="selectedColorKey === option.key ? 'border-slate-800 bg-white text-slate-900' : 'border-slate-300 bg-white text-slate-700'"
              @click="selectColor(option.key, $event)"
            >
              <span class="h-3 w-3 rounded-full border border-slate-300" :class="colorDotClass(option.key)" />
              {{ option.label }}
            </button>
          </div>
          <p class="mt-2 text-[11px] text-slate-500">
            Choose a color, then pick whether to apply it to this block or all blocks of this type.
          </p>
        </div>

        <label class="block text-sm">
          <div class="mb-1 flex items-center justify-between gap-2">
            <span class="block text-xs text-slate-600">{{ nameFieldLabel }}</span>
            <button
              v-if="isAppointmentRecord"
              type="button"
              class="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="isLookingUpCustomer || !draft.customerName.trim()"
              @click="lookupCustomerByName"
            >
              {{ isLookingUpCustomer ? 'Looking up...' : 'Lookup' }}
            </button>
          </div>
          <input
            ref="customerNameInput"
            v-model="draft.customerName"
            class="h-9 w-full rounded-md border border-slate-200 px-2"
            :class="showCustomerNameError ? 'border-red-300' : ''"
          />
          <span v-if="showCustomerNameError" class="mt-1 block text-xs text-red-600">
            Customer name is required for appointments.
          </span>
          <span v-if="lookupError" class="mt-1 block text-xs text-red-600">
            {{ lookupError }}
          </span>
        </label>

        <div
          v-if="record.recordType !== 'schedule_note' && record.recordType !== 'quick_note'"
          class="grid gap-3 md:grid-cols-2"
        >
          <label class="block text-sm">
            <div class="mb-1 flex items-center justify-between gap-2">
              <span class="block text-xs text-slate-600">Phone</span>
              <button
                v-if="isAppointmentRecord"
                type="button"
                class="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="isLookingUpCustomer || !draft.customerPhone?.trim()"
                @click="lookupCustomerByPhone"
              >
                {{ isLookingUpCustomer ? 'Looking up...' : 'Lookup' }}
              </button>
            </div>
            <input v-model="draft.customerPhone" class="h-9 w-full rounded-md border border-slate-200 px-2" />
          </label>
          <label class="block text-sm">
            <div class="mb-1 flex items-center justify-between gap-2">
              <span class="block text-xs text-slate-600">Email</span>
              <span class="invisible rounded border border-transparent px-2 py-1 text-xs">Lookup</span>
            </div>
            <input v-model="draft.customerEmail" class="h-9 w-full rounded-md border border-slate-200 px-2" />
          </label>
        </div>

        <div
          v-if="isAppointmentRecord && lookupMatches.length > 1"
          class="rounded-md border border-slate-200 bg-slate-50 p-3"
        >
          <p class="mb-2 text-xs font-medium text-slate-700">Select customer</p>
          <div class="max-h-40 space-y-2 overflow-y-auto">
            <button
              v-for="(match, index) in lookupMatches"
              :key="`customer-match-${index}`"
              type="button"
              class="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
              @click="applyLookupMatch(match)"
            >
              <div class="font-medium text-slate-900">{{ match.Name || match.name || 'Unnamed customer' }}</div>
              <div class="text-slate-600">
                {{ formatLookupContact(match) }}
              </div>
            </button>
          </div>
        </div>

        <div
          v-if="isAppointmentRecord && lookupVehicleChoices.length > 1"
          class="rounded-md border border-slate-200 bg-slate-50 p-3"
        >
          <p class="mb-2 text-xs font-medium text-slate-700">Select vehicle</p>
          <div class="max-h-40 space-y-2 overflow-y-auto">
            <button
              v-for="(vehicle, index) in lookupVehicleChoices"
              :key="`vehicle-match-${index}`"
              type="button"
              class="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
              @click="applyLookupVehicle(index)"
            >
              {{ formatLookupVehicle(vehicle, index) }}
            </button>
          </div>
        </div>

        <div v-if="isAppointmentRecord" class="grid gap-3 md:grid-cols-3">
          <label class="block text-sm">
            <span class="mb-1 block text-xs text-slate-600">Vehicle year</span>
            <input v-model="draftVehicleYear" class="h-9 w-full rounded-md border border-slate-200 px-2" />
          </label>
          <label class="block text-sm">
            <span class="mb-1 block text-xs text-slate-600">Vehicle make</span>
            <input v-model="draftVehicleMake" class="h-9 w-full rounded-md border border-slate-200 px-2" />
          </label>
          <label class="block text-sm">
            <span class="mb-1 block text-xs text-slate-600">Vehicle model</span>
            <input v-model="draftVehicleModel" class="h-9 w-full rounded-md border border-slate-200 px-2" />
          </label>
        </div>

        <label v-if="draft.recordType === 'schedule_note'" class="block text-sm">
          <span class="mb-1 block text-xs text-slate-600">Schedule blocker type</span>
          <select
            v-model="draft.scheduleBlockerType"
            class="h-9 w-full rounded-md border border-slate-200 px-2"
            :class="showScheduleBlockerError ? 'border-red-300' : ''"
          >
            <option value="">Select blocker type</option>
            <option value="bay_blocker">Bay blocker</option>
            <option value="shop_close">Shop close</option>
            <option value="technician_unavailable">Technician unavailable</option>
          </select>
          <span v-if="showScheduleBlockerError" class="mt-1 block text-xs text-red-600">
            Schedule blocker type is required for schedule notes.
          </span>
        </label>

        <div class="grid gap-3 md:grid-cols-2">
          <label class="block text-sm">
            <span class="mb-1 block text-xs text-slate-600">Date</span>
            <input v-model="draft.requestedDate" type="date" class="h-9 w-full rounded-md border border-slate-200 px-2" />
          </label>
          <label class="block text-sm">
            <span class="mb-1 block text-xs text-slate-600">Time</span>
            <input v-model="draft.requestedTime" type="time" class="h-9 w-full rounded-md border border-slate-200 px-2" />
          </label>
        </div>

        <div class="grid gap-3 md:grid-cols-2">
          <label class="block text-sm">
            <span class="mb-1 block text-xs text-slate-600">Duration (hours)</span>
            <input
              v-model.number="durationHours"
              type="number"
              min="0"
              step="1"
              class="h-9 w-full rounded-md border border-slate-200 px-2"
            />
          </label>
          <label class="block text-sm">
            <span class="mb-1 block text-xs text-slate-600">Duration (minutes)</span>
            <input
              v-model.number="durationMinutes"
              type="number"
              min="0"
              max="59"
              step="15"
              class="h-9 w-full rounded-md border border-slate-200 px-2"
            />
          </label>
          <label
            v-if="draft.recordType !== 'quick_note' && draft.recordType !== 'schedule_note'"
            class="block text-sm"
          >
            <span class="mb-1 block text-xs text-slate-600">{{
              isAppointmentRecord ? 'Service status' : 'Status'
            }}</span>
            <select v-model="draft.status" class="h-9 w-full rounded-md border border-slate-200 px-2">
              <option v-for="option in statuses" :key="option" :value="option">{{ statusLabel(option) }}</option>
            </select>
          </label>
        </div>

        <label class="block text-sm">
          <span class="mb-1 block text-xs text-slate-600">Notes</span>
          <textarea v-model="draft.note" rows="4" class="w-full rounded-md border border-slate-200 p-2" />
        </label>

        <div class="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <div>Created: {{ formatTimestamp(record.createdAt) }}</div>
          <div>Created by: {{ record.createdBy }}</div>
          <div>POS status: {{ posStatusLabel }}</div>
        </div>
      </div>

      <div v-show="isAppointmentRecord && drawerTab === 'ticket'" class="space-y-3">
        <div v-if="linkedInvoiceNum == null" class="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          No POS ticket is linked yet. After the shop creates or links a ticket, open this tab again to load line
          items.
        </div>
        <div v-else-if="ticketLoading" class="py-8 text-center text-sm text-slate-500">Loading ticket…</div>
        <div v-else-if="ticketError" class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {{ ticketError }}
        </div>
        <InvoiceTicketCorePreview
          v-else-if="ticketDetail?.success && ticketPreviewTicket"
          :ticket="ticketPreviewTicket"
          :invoice-detail="ticketDetail"
        />
        <div
          v-else-if="ticketDetail?.success"
          class="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          Ticket data was returned but could not be formatted for display.
        </div>
      </div>

      <div v-show="!isAppointmentRecord || drawerTab === 'appointment'" class="mt-4 flex flex-wrap gap-2 border-t pt-4">
        <button
          class="rounded-md px-3 py-2 text-sm text-white"
          :class="canSave ? 'bg-slate-900' : 'cursor-not-allowed bg-slate-400'"
          type="button"
          :disabled="!canSave"
          @click="save"
        >
          Save
        </button>
        <button
          v-if="record.recordType === 'booked_unconfirmed'"
          class="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900"
          type="button"
          @click="$emit('confirm', record.id)"
        >
          Confirm
        </button>
        <button
          v-if="isAppointmentRecord"
          class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
          type="button"
          @click="$emit('reschedule', record.id)"
        >
          Reschedule
        </button>
        <button
          class="ml-auto rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
          type="button"
          @click="remove($event)"
        >
          Delete
        </button>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import type { AppointmentBlockColorKey, AppointmentRecord, AppointmentStatus } from '@/types/appointment'
import InvoiceTicketCorePreview from '@/components/invoices/InvoiceTicketCorePreview.vue'
import { buildTicketFromInvoiceDetail, fetchInvoiceDetail } from '@/api/tickets'
import type { InvoiceDetailResponse } from '@/types/ticket'
import {
  APPOINTMENT_BLOCK_COLOR_OPTIONS,
  getAppointmentLinkedInvoiceNum,
  getResolvedRecordColorToken,
  getRecordTypeLabel,
  isAppointmentRecordType,
  requiresCustomerNameForRecordType,
  requiresScheduleBlockerTypeForRecordType,
} from '@/api/appointments'
import { normalizeDuration, toDurationParts, toTotalMinutes } from '@/lib/appointments/duration'
import { confirmAnchored } from '@/lib/ui/anchoredUserDialog'
import { customerVehicleLookup, mapCustomerDataToForm } from '@/lib/customer-api'

const props = defineProps<{
  record: AppointmentRecord | null
  autofocusCustomerName?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (
    e: 'attempt-close',
    payload: {
      source: 'overlay' | 'button'
      hasChanges: boolean
      patch: Partial<AppointmentRecord> | null
      anchor?: MouseEvent
    }
  ): void
  (e: 'save', payload: { id: string; patch: Partial<AppointmentRecord> }): void
  (e: 'delete', id: string): void
  (e: 'confirm', id: string): void
  (e: 'reschedule', id: string): void
  (
    e: 'request-color-change',
    payload: {
      recordId: string
      colorKey: AppointmentBlockColorKey
      recordType: AppointmentRecord['recordType']
      anchor?: MouseEvent
    }
  ): void
}>()

const draft = ref<AppointmentRecord | null>(null)
const showColorSettings = ref(false)
const customerNameInput = ref<HTMLInputElement | null>(null)
const isLookingUpCustomer = ref(false)
const lookupError = ref('')
const lookupMatches = ref<any[]>([])
const lookupVehicleChoices = ref<any[]>([])
const lookupVehicleSourceCustomer = ref<any | null>(null)

const drawerTab = ref<'appointment' | 'ticket'>('appointment')
const ticketDetail = ref<InvoiceDetailResponse | null>(null)
const ticketLoading = ref(false)
const ticketError = ref('')
const loadedForRecordId = ref<string | null>(null)
const loadedForInvoiceNum = ref<number | null>(null)
let ticketFetchAbort: AbortController | null = null

const resetTicketState = () => {
  ticketFetchAbort?.abort()
  ticketFetchAbort = null
  ticketDetail.value = null
  ticketError.value = ''
  ticketLoading.value = false
  loadedForRecordId.value = null
  loadedForInvoiceNum.value = null
}

const cloneRecord = (value: AppointmentRecord): AppointmentRecord =>
  JSON.parse(JSON.stringify(value)) as AppointmentRecord

watch(
  () => props.record,
  (value) => {
    draft.value = value ? cloneRecord(value) : null
    showColorSettings.value = false
    lookupError.value = ''
    lookupMatches.value = []
    lookupVehicleChoices.value = []
    lookupVehicleSourceCustomer.value = null
    drawerTab.value = 'appointment'
    resetTicketState()
  },
  { immediate: true }
)

watch(
  () => [props.record?.id, props.autofocusCustomerName] as const,
  async ([recordId, shouldFocus]) => {
    if (!recordId || !shouldFocus) return
    await nextTick()
    customerNameInput.value?.focus()
  },
  { immediate: true }
)

const statuses: AppointmentStatus[] = ['confirmed', 'unconfirmed']
const statusLabel = (status: AppointmentStatus) => (status === 'confirmed' ? 'Confirmed' : 'Unconfirmed')

const isAppointmentRecord = computed(() =>
  props.record ? isAppointmentRecordType(props.record.recordType) : false
)

const linkedInvoiceNum = computed(() =>
  props.record ? getAppointmentLinkedInvoiceNum(props.record) : null
)

const ticketPreviewTicket = computed(() => {
  const d = ticketDetail.value
  if (!d?.success) return null
  return buildTicketFromInvoiceDetail(d)
})

const ensureTicketLoaded = async () => {
  const r = props.record
  if (!r) return
  const inv = getAppointmentLinkedInvoiceNum(r)
  if (inv == null) {
    ticketDetail.value = null
    ticketError.value = ''
    ticketLoading.value = false
    loadedForRecordId.value = null
    loadedForInvoiceNum.value = null
    return
  }
  if (
    loadedForRecordId.value === r.id &&
    loadedForInvoiceNum.value === inv &&
    ticketDetail.value?.success
  ) {
    return
  }
  ticketFetchAbort?.abort()
  ticketFetchAbort = new AbortController()
  const signal = ticketFetchAbort.signal
  ticketLoading.value = true
  ticketError.value = ''
  ticketDetail.value = null
  loadedForRecordId.value = null
  loadedForInvoiceNum.value = null
  try {
    const res = await fetchInvoiceDetail({ invoiceNum: inv }, signal)
    if (signal.aborted) return
    if (props.record?.id !== r.id) return
    ticketDetail.value = res
    if (!res.success) {
      ticketError.value = res.error || res.errorText || 'Could not load ticket'
      return
    }
    loadedForRecordId.value = r.id
    loadedForInvoiceNum.value = inv
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') return
    if (e instanceof Error && e.name === 'AbortError') return
    if (props.record?.id !== r.id) return
    ticketError.value = e instanceof Error ? e.message : 'Failed to load ticket'
  } finally {
    if (props.record?.id === r.id) {
      ticketLoading.value = false
    }
  }
}

watch(
  () => [drawerTab.value, props.record?.id] as const,
  async ([tab]) => {
    if (tab !== 'ticket') return
    await ensureTicketLoaded()
  }
)

const posStatusLabel = computed(() => {
  if (!props.record) return 'Not Sent'
  return props.record.posFlag || props.record.apiSubmitted ? 'Sent' : 'Not Sent'
})

const showCustomerNameError = computed(() => {
  if (!draft.value) return false
  return requiresCustomerNameForRecordType(draft.value.recordType) && !draft.value.customerName.trim()
})

const showScheduleBlockerError = computed(() => {
  if (!draft.value) return false
  return requiresScheduleBlockerTypeForRecordType(draft.value.recordType) && !draft.value.scheduleBlockerType
})

const canSave = computed(() => !showCustomerNameError.value && !showScheduleBlockerError.value)

const draftVehicleYear = computed({
  get: () => draft.value?.vehicle?.year || '',
  set: (value: string) => {
    if (!draft.value) return
    draft.value.vehicle = { ...(draft.value.vehicle || {}), year: value.trim() || undefined }
  },
})

const draftVehicleMake = computed({
  get: () => draft.value?.vehicle?.make || '',
  set: (value: string) => {
    if (!draft.value) return
    draft.value.vehicle = { ...(draft.value.vehicle || {}), make: value.trim() || undefined }
  },
})

const draftVehicleModel = computed({
  get: () => draft.value?.vehicle?.model || '',
  set: (value: string) => {
    if (!draft.value) return
    draft.value.vehicle = { ...(draft.value.vehicle || {}), model: value.trim() || undefined }
  },
})

const setDraftDurationFromParts = (hours: number, minutes: number) => {
  if (!draft.value) return
  draft.value.requestedDuration = normalizeDuration(toTotalMinutes(hours, minutes))
}

const durationParts = computed(() => toDurationParts(draft.value?.requestedDuration ?? 0))

const durationHours = computed({
  get: () => durationParts.value.hours,
  set: (value: number) => {
    setDraftDurationFromParts(value, durationParts.value.minutes)
  },
})

const durationMinutes = computed({
  get: () => durationParts.value.minutes,
  set: (value: number) => {
    setDraftDurationFromParts(durationParts.value.hours, value)
  },
})

const recordTitle = computed(() => {
  if (!props.record) return ''
  if (isAppointmentRecordType(props.record.recordType) && !props.record.customerName.trim()) {
    return 'New Appointment'
  }
  return props.record.customerName?.trim() || getRecordTypeLabel(props.record.recordType)
})

const nameFieldLabel = computed(() => {
  if (!draft.value) return 'Customer name'
  return requiresCustomerNameForRecordType(draft.value.recordType) ? 'Customer name' : 'Note title (optional)'
})

const formatLookupContact = (customer: any): string => {
  const contacts = customer?.Contacts || customer?.contacts || []
  const phone = contacts.find((c: any) => c.Type === 'PHONE' || c.type === 'PHONE')?.Value
    || contacts.find((c: any) => c.Type === 'PHONE' || c.type === 'PHONE')?.value
  const email = contacts.find((c: any) => c.Type === 'EMAIL' || c.type === 'EMAIL')?.Value
    || contacts.find((c: any) => c.Type === 'EMAIL' || c.type === 'EMAIL')?.value
  return [phone, email].filter(Boolean).join(' | ') || 'No phone/email'
}

const colorOptions = APPOINTMENT_BLOCK_COLOR_OPTIONS

const selectedColorKey = computed<AppointmentBlockColorKey | null>(() => {
  if (!draft.value) return null
  if (draft.value.colorOverride) return draft.value.colorOverride
  const token = getResolvedRecordColorToken(draft.value)
  const matched = colorOptions.find((option) => option.classToken === token)
  return matched?.key || null
})

const colorDotClass = (colorKey: AppointmentBlockColorKey) => {
  const token = colorOptions.find((option) => option.key === colorKey)?.classToken || ''
  return token.split(' ').filter((part) => part.startsWith('bg-')).join(' ')
}

const selectColor = (colorKey: AppointmentBlockColorKey, anchor?: MouseEvent) => {
  if (!draft.value || !props.record) return
  draft.value.colorOverride = colorKey
  emit('request-color-change', {
    recordId: props.record.id,
    colorKey,
    recordType: draft.value.recordType,
    anchor,
  })
}

const applyVehicleFromCustomer = (customer: any, vehicleIndex = 0) => {
  if (!draft.value) return
  const mapped = mapCustomerDataToForm(customer, undefined, undefined, vehicleIndex)
  draft.value.vehicle = {
    ...(draft.value.vehicle || {}),
    year: mapped.vehicle?.year || undefined,
    make: mapped.vehicle?.make || undefined,
    model: mapped.vehicle?.model || undefined,
  }
}

const formatLookupVehicle = (vehicle: any, index: number): string => {
  const year = vehicle?.Year || vehicle?.year || ''
  const make = vehicle?.Make || vehicle?.make || ''
  const model = vehicle?.Model || vehicle?.model || ''
  const plate = vehicle?.Tag || vehicle?.tag || ''
  const label = [year, make, model].filter(Boolean).join(' ').trim()
  if (label && plate) return `${label} (${plate})`
  if (label) return label
  if (plate) return `Plate ${plate}`
  return `Vehicle ${index + 1}`
}

const applyLookupVehicle = (vehicleIndex: number) => {
  if (!lookupVehicleSourceCustomer.value) return
  applyVehicleFromCustomer(lookupVehicleSourceCustomer.value, vehicleIndex)
  lookupVehicleChoices.value = []
  lookupVehicleSourceCustomer.value = null
}

const applyLookupMatch = (customer: any) => {
  if (!draft.value) return
  const mapped = mapCustomerDataToForm(customer)
  draft.value.customerName = mapped.name || draft.value.customerName
  draft.value.customerPhone = mapped.phone || ''
  draft.value.customerEmail = mapped.email || ''
  draft.value.customerId = mapped.custNum ? String(mapped.custNum) : draft.value.customerId
  const vehicles = customer?.Vehicles || customer?.vehicles || []
  if (Array.isArray(vehicles) && vehicles.length > 0) {
    lookupVehicleChoices.value = vehicles
    lookupVehicleSourceCustomer.value = customer
    applyVehicleFromCustomer(customer, 0)
  } else {
    applyVehicleFromCustomer(customer, 0)
    lookupVehicleChoices.value = []
    lookupVehicleSourceCustomer.value = null
  }
  lookupMatches.value = []
  lookupError.value = ''
}

const lookupCustomerByName = async () => {
  if (!draft.value) return
  const searchValue = draft.value.customerName.trim()
  await runCustomerLookup('NAME', searchValue, 'Enter a customer name before lookup.')
}

const lookupCustomerByPhone = async () => {
  if (!draft.value) return
  const searchValue = draft.value.customerPhone?.trim() || ''
  await runCustomerLookup('PHONE', searchValue, 'Enter a phone number before lookup.')
}

const runCustomerLookup = async (
  searchKey: 'NAME' | 'PHONE',
  searchValue: string,
  emptySearchError: string
) => {
  if (!searchValue) {
    lookupError.value = emptySearchError
    lookupMatches.value = []
    return
  }
  isLookingUpCustomer.value = true
  lookupError.value = ''
  lookupMatches.value = []
  lookupVehicleChoices.value = []
  lookupVehicleSourceCustomer.value = null
  try {
    const result = await customerVehicleLookup({
      searchKey,
      searchValue,
      maxCustomers: 50,
      showInactive: false,
    })
    if (!result.success || !result.customers || result.customers.length === 0) {
      lookupError.value = result.error || 'No customers found.'
      return
    }
    if (result.customers.length === 1) {
      applyLookupMatch(result.customers[0])
      return
    }
    lookupMatches.value = result.customers
  } finally {
    isLookingUpCustomer.value = false
  }
}

const save = () => {
  if (!props.record || !draft.value) return
  if (!canSave.value) return
  emit('save', { id: props.record.id, patch: draft.value })
}

const remove = async (e?: MouseEvent) => {
  if (!props.record) return
  const ok = await confirmAnchored({
    message: 'Delete this appointment? This action cannot be undone.',
    anchor: e,
    preferenceKey: 'appointments.deleteRecord',
    variant: 'danger',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
  })
  if (ok) {
    emit('delete', props.record.id)
  }
}

const hasDraftChanges = () => {
  if (!props.record || !draft.value) return false
  return JSON.stringify(draft.value) !== JSON.stringify(props.record)
}

const requestClose = (source: 'overlay' | 'button', anchor?: MouseEvent) => {
  emit('attempt-close', {
    source,
    hasChanges: hasDraftChanges(),
    patch: draft.value ? { ...draft.value } : null,
    anchor,
  })
}

const formatTimestamp = (value: string): string => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  const year = parsed.getFullYear()
  const month = parsed.getMonth() + 1
  const day = parsed.getDate()
  const hours = String(parsed.getHours()).padStart(2, '0')
  const minutes = String(parsed.getMinutes()).padStart(2, '0')
  const seconds = String(parsed.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

onUnmounted(() => {
  ticketFetchAbort?.abort()
})
</script>
