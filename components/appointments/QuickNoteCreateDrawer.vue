<template>
  <div v-if="open && localDraft" class="fixed inset-0 z-50">
    <div class="absolute inset-0 bg-black/20" @click="$emit('close')" />
    <aside class="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white p-4 shadow-xl">
      <div class="mb-4 flex items-start justify-between">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">New Quick Note</h2>
          <p class="text-xs text-slate-500">Capture a note for the selected day or timeslot.</p>
        </div>
        <button type="button" class="rounded border px-2 py-1 text-xs" @click="$emit('close')">Close</button>
      </div>

      <div class="space-y-3">
        <label class="block text-sm">
          <span class="mb-1 block text-xs text-slate-600">Title (optional)</span>
          <input v-model="localDraft.customerName" class="h-9 w-full rounded-md border border-slate-200 px-2" />
        </label>

        <div class="grid gap-3 md:grid-cols-2">
          <label class="block text-sm">
            <span class="mb-1 block text-xs text-slate-600">Date</span>
            <input v-model="localDraft.requestedDate" type="date" class="h-9 w-full rounded-md border border-slate-200 px-2" />
          </label>
          <label class="block text-sm">
            <span class="mb-1 block text-xs text-slate-600">Time</span>
            <input v-model="localDraft.requestedTime" type="time" class="h-9 w-full rounded-md border border-slate-200 px-2" />
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
        </div>

        <label class="block text-sm">
          <span class="mb-1 block text-xs text-slate-600">Note</span>
          <textarea v-model="localDraft.note" rows="4" class="w-full rounded-md border border-slate-200 p-2" />
        </label>
      </div>

      <div class="mt-4 flex flex-wrap gap-2 border-t pt-4">
        <button class="rounded-md bg-slate-900 px-3 py-2 text-sm text-white" type="button" @click="save">Save</button>
        <button
          class="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          type="button"
          @click="createAppointment"
        >
          Create Appointment
        </button>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { normalizeDuration, toDurationParts, toTotalMinutes } from '@/lib/appointments/duration'

const props = defineProps<{
  open: boolean
  draft: {
    customerName: string
    requestedDate: string
    requestedTime: string
    requestedDuration: number
    note: string
  }
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (
    e: 'save',
    payload: {
      customerName: string
      requestedDate: string
      requestedTime: string
      requestedDuration: number
      note: string
    }
  ): void
  (
    e: 'create-appointment',
    payload: {
      customerName: string
      requestedDate: string
      requestedTime: string
      requestedDuration: number
      note: string
    }
  ): void
}>()

const localDraft = ref({ ...props.draft })

watch(
  () => props.draft,
  (value) => {
    localDraft.value = { ...value }
  },
  { deep: true, immediate: true }
)

const setDurationFromParts = (hours: number, minutes: number) => {
  localDraft.value.requestedDuration = normalizeDuration(toTotalMinutes(hours, minutes))
}

const durationParts = computed(() => toDurationParts(localDraft.value.requestedDuration))

const durationHours = computed({
  get: () => durationParts.value.hours,
  set: (value: number) => {
    setDurationFromParts(value, durationParts.value.minutes)
  },
})

const durationMinutes = computed({
  get: () => durationParts.value.minutes,
  set: (value: number) => {
    setDurationFromParts(durationParts.value.hours, value)
  },
})

const normalizeDraft = () => ({
  ...localDraft.value,
  requestedDuration: normalizeDuration(localDraft.value.requestedDuration),
})

const save = () => {
  emit('save', normalizeDraft())
}

const createAppointment = () => {
  emit('create-appointment', normalizeDraft())
}
</script>
