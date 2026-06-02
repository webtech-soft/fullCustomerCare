<template>
  <div class="h-full min-h-dvh bg-brand-shell">
    <div class="mx-auto max-w-lg px-3 py-6 sm:px-4 sm:py-8">
      <div v-if="loading" class="flex min-h-[280px] items-center justify-center text-slate-600">Loading…</div>

      <div v-else-if="error" class="rounded-lg border border-red-200 bg-white p-6 text-center">
        <h2 class="text-lg font-semibold text-red-800">Unable to load</h2>
        <p class="mt-2 text-sm text-slate-600">{{ error }}</p>
      </div>

      <div v-else-if="success" class="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
        <PhCheckCircle :size="40" weight="fill" class="mx-auto text-emerald-600" />
        <h2 class="mt-3 text-lg font-semibold text-emerald-900">You’re all set</h2>
        <p class="mt-2 text-sm text-slate-700">We received your time choice. The shop will update your appointment.</p>
        <p v-if="confirmedSlot" class="mt-3 text-sm font-medium text-slate-900">{{ formatSlot(confirmedSlot) }}</p>
        <a
          v-if="calendarDataUri && confirmedSlot"
          :href="calendarDataUri"
          :download="calendarFileName"
          class="mt-3 inline-flex text-sm font-medium text-brand-accent underline hover:text-brand-accent/80"
        >
          Add to calendar
        </a>
      </div>

      <div v-else-if="offer" class="space-y-4">
        <div class="rounded-lg border bg-white p-5 shadow-sm">
          <h1 class="text-xl font-bold text-slate-900">Reschedule</h1>
          <p v-if="offer.customerName" class="mt-1 text-sm text-slate-600">Hi {{ offer.customerName }},</p>
          <p class="mt-2 text-sm text-slate-600">Tap one of the times below to confirm your choice.</p>
        </div>

        <div v-if="offer.status === 'chosen' && offer.chosenSlot" class="rounded-lg border border-slate-200 bg-white p-4">
          <p class="text-sm font-medium text-slate-800">You selected</p>
          <p class="mt-1 text-base text-slate-900">{{ formatSlot(offer.chosenSlot) }}</p>
        </div>

        <div v-else class="space-y-2">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Choose a time</p>
          <button
            v-for="(slot, idx) in offer.slots"
            :key="idx"
            type="button"
            class="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="selecting || offer.status !== 'pending'"
            @click="selectSlot(slot)"
          >
            <span class="font-medium text-slate-900">{{ formatSlot(slot) }}</span>
            <span v-if="selectingSlotKey === slotKey(slot)" class="text-xs text-slate-500">Sending…</span>
            <span v-else class="text-xs text-brand-accent">Select</span>
          </button>
        </div>

        <p v-if="selectError" class="text-sm text-red-600">{{ selectError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { PhCheckCircle } from '@phosphor-icons/vue'
import {
  fetchAppointmentRescheduleOffer,
  postAppointmentRescheduleSelect,
  type PublicRescheduleOffer,
  type RescheduleOfferSlot,
} from '@/api/appointmentRescheduleServer'
import { formatTimeLabel } from '@/lib/appointments/time'

const route = useRoute()
const loading = ref(true)
const error = ref<string | null>(null)
const success = ref(false)
const offer = ref<PublicRescheduleOffer | null>(null)
const confirmedSlot = ref<RescheduleOfferSlot | null>(null)

const selecting = ref(false)
const selectingSlotKey = ref<string | null>(null)
const selectError = ref('')

const token = computed(() => {
  const q = route.query.token
  return typeof q === 'string' ? q.trim() : ''
})

function slotKey(s: RescheduleOfferSlot): string {
  return `${s.date}|${s.time}`
}

function formatSlot(s: RescheduleOfferSlot): string {
  const [y, m, d] = s.date.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const datePart = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  return `${datePart} at ${formatTimeLabel(s.time)}`
}

function toSlotDate(s: RescheduleOfferSlot): Date {
  const [year, month, day] = s.date.split('-').map(Number)
  const [hours, minutes] = s.time.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes, 0, 0)
}

function toIcsDateLocal(input: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return [
    input.getFullYear(),
    pad(input.getMonth() + 1),
    pad(input.getDate()),
    'T',
    pad(input.getHours()),
    pad(input.getMinutes()),
    '00',
  ].join('')
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

const eventShopName = computed(() => offer.value?.shopName?.trim() || 'your shop')
const eventTitle = computed(() => `Appointment at ${eventShopName.value}`)
const eventDurationMinutes = computed(() => {
  const duration = Number(offer.value?.durationMinutes)
  return Number.isFinite(duration) && duration > 0 ? duration : 60
})
const selectedSlotForCalendar = computed(() => confirmedSlot.value ?? offer.value?.chosenSlot ?? null)
const calendarFileName = computed(() => {
  const slot = selectedSlotForCalendar.value
  if (!slot) return 'appointment.ics'
  return `appointment-reschedule-${slot.date}-${slot.time.replace(':', '')}.ics`
})
const calendarDataUri = computed(() => {
  const slot = selectedSlotForCalendar.value
  if (!slot) return ''
  const start = toSlotDate(slot)
  const end = new Date(start.getTime() + eventDurationMinutes.value * 60 * 1000)
  const nowStamp = toIcsDateLocal(new Date())
  const title = escapeIcsText(eventTitle.value)
  const description = escapeIcsText(`Rescheduled service appointment at ${eventShopName.value}.`)
  const uid = escapeIcsText(`${slotKey(slot)}@appointment-reschedule`)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Customer Care//Appointment Reschedule//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowStamp}`,
    `DTSTART:${toIcsDateLocal(start)}`,
    `DTEND:${toIcsDateLocal(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`
})

onMounted(async () => {
  if (!token.value) {
    error.value = 'This link is missing required information.'
    loading.value = false
    return
  }
  const res = await fetchAppointmentRescheduleOffer(token.value)
  loading.value = false
  if (!res.success) {
    error.value = res.error
    return
  }
  offer.value = res.offer
  confirmedSlot.value = res.offer.chosenSlot
})

const selectSlot = async (slot: RescheduleOfferSlot) => {
  if (!token.value || !offer.value || offer.value.status !== 'pending') return
  selectError.value = ''
  selecting.value = true
  selectingSlotKey.value = slotKey(slot)
  try {
    const res = await postAppointmentRescheduleSelect(token.value, slot)
    if (!res.success) {
      selectError.value = res.error
      return
    }
    confirmedSlot.value = res.chosenSlot ?? slot
    if (offer.value) {
      offer.value = {
        ...offer.value,
        status: 'chosen',
        chosenSlot: confirmedSlot.value,
      }
    }
    success.value = true
  } finally {
    selecting.value = false
    selectingSlotKey.value = null
  }
}
</script>
