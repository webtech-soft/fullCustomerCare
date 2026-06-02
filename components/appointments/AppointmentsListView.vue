<template>
  <div class="bg-white rounded-lg border overflow-hidden overflow-x-auto">
    <table class="w-full">
      <thead class="bg-slate-50 border-b">
        <tr>
          <th
            class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            <div class="flex items-center gap-2"><span>Date</span></div>
          </th>
          <th
            class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            <div class="flex items-center gap-2"><span>Time</span></div>
          </th>
          <th
            class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            <div class="flex items-center gap-2"><span>Ticket</span></div>
          </th>
          <th
            class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            <div class="flex items-center gap-2"><span>Customer</span></div>
          </th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Phone</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Email</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Vehicle</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Reason(s) for Repair</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Bay</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
          <th
            class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            <div class="flex items-center gap-2"><span>Status</span></div>
          </th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-slate-200">
        <tr
          v-for="record in records"
          :key="record.id"
          class="cursor-pointer transition-colors hover:bg-slate-50"
          @click="$emit('open', record.id)"
        >
          <td class="px-4 py-3 whitespace-nowrap">
            <div class="text-sm text-slate-900">{{ formatAppointmentDate(record.requestedDate) }}</div>
          </td>
          <td class="px-4 py-3 whitespace-nowrap">
            <div class="text-sm text-slate-900">{{ formatAppointmentTime(record.requestedTime) }}</div>
          </td>
          <td class="px-4 py-3 whitespace-nowrap">
            <div class="text-sm font-medium text-slate-800">{{ formatAppointmentTicketNumber(record) || '—' }}</div>
          </td>
          <td class="px-4 py-3">
            <div class="text-sm font-semibold text-slate-900">{{ record.customerName }}</div>
          </td>
          <td class="px-4 py-3 whitespace-nowrap">
            <div class="text-sm text-slate-900">{{ record.customerPhone ? formatPhone(record.customerPhone) : '—' }}</div>
          </td>
          <td class="px-4 py-3 whitespace-nowrap">
            <div class="text-sm text-slate-900">{{ record.customerEmail || '—' }}</div>
          </td>
          <td class="px-4 py-3">
            <div class="text-sm text-slate-900">{{ vehicleLabel(record) }}</div>
            <div v-if="record.vehicle?.licensePlate" class="text-xs text-slate-600">License: {{ record.vehicle.licensePlate }}</div>
          </td>
          <td class="px-4 py-3">
            <div class="text-sm text-slate-900">{{ record.note || '—' }}</div>
          </td>
          <td class="px-4 py-3 whitespace-nowrap">
            <div class="text-sm text-slate-900">{{ record.bayName || 'No Bay' }}</div>
          </td>
          <td class="px-4 py-3 whitespace-nowrap">
            <span class="inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold" :class="getResolvedRecordColorToken(record)">
              {{ getRecordTypeLabel(record.recordType) }}
            </span>
          </td>
          <td class="px-4 py-3 whitespace-nowrap">
            <span class="inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold" :class="getStatusColor(record)">
              {{ getListStatusLabel(record) }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { AppointmentRecord } from '@/types/appointment'
import { formatAppointmentTicketNumber, getRecordTypeLabel, getResolvedRecordColorToken } from '@/api/appointments'

defineProps<{ records: AppointmentRecord[] }>()
defineEmits<{ (e: 'open', id: string): void }>()

const vehicleLabel = (record: AppointmentRecord) =>
  [record.vehicle?.year, record.vehicle?.make, record.vehicle?.model].filter(Boolean).join(' ') || 'No vehicle'

const getListStatusLabel = (record: AppointmentRecord) => (record.recordType === 'confirmed' ? 'Confirmed' : 'Unconfirmed')

const formatAppointmentDate = (dateStr: string): string => {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatAppointmentTime = (time: string): string => {
  const [hourStr, minuteStr] = time.split(':')
  const hour = parseInt(hourStr, 10)
  const minute = parseInt(minuteStr, 10)
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHours = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHours}:${minute.toString().padStart(2, '0')} ${period}`
}

const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

const getStatusColor = (record: AppointmentRecord) =>
  record.recordType === 'confirmed'
    ? 'bg-brand-accent/15 text-brand-accent border-brand-accent/30'
    : 'bg-red-100 text-red-800 border-red-200'

</script>
