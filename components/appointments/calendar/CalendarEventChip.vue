<template>
  <button
    type="button"
    class="flex w-full flex-col truncate rounded border px-2 py-1 text-left text-xs"
    :class="chipClass"
    :title="chipTitle"
    @click="$emit('open', record.id)"
  >
    <span class="truncate">{{ record.requestedTime }} · {{ title }}</span>
    <span v-if="ticketLabel" class="truncate text-[10px] font-medium text-slate-600">{{ ticketLabel }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AppointmentRecord } from '@/types/appointment'
import { formatAppointmentTicketNumber, getRecordDisplayTitle, getResolvedRecordColorToken } from '@/api/appointments'

const props = defineProps<{ record: AppointmentRecord }>()

defineEmits<{ (e: 'open', id: string): void }>()

const chipClass = computed(() => {
  const typeClass = getResolvedRecordColorToken(props.record)
  if (props.record.recordType === 'booked_unconfirmed') {
    return `${typeClass} border-dashed`
  }
  return typeClass
})

const title = computed(() => getRecordDisplayTitle(props.record))

const ticketLabel = computed(() => formatAppointmentTicketNumber(props.record) || '')

const chipTitle = computed(() => {
  const t = ticketLabel.value
  return t ? `${props.record.requestedTime} · ${title.value} (${t})` : `${props.record.requestedTime} · ${title.value}`
})
</script>
