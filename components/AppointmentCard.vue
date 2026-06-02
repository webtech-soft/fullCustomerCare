<template>
  <Card class="overflow-hidden transition-shadow hover:shadow-md">
    <CardHeader class="pb-3">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex-1 space-y-1">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="text-lg font-semibold text-slate-900">
              {{ formatAppointmentDate(appointment.apptDate) }}
            </h3>
            <Badge variant="outline" class="text-xs">
              {{ formatAppointmentTime(appointment.apptTime) }}
            </Badge>
          </div>
          <p class="text-sm text-slate-600">{{ appointment.custFirstName }} {{ appointment.custLastName }}</p>
        </div>
        <div class="text-right">
          <Badge
            :class="cn(
              'text-xs font-semibold',
              getStatusColor(appointment.status)
            )"
          >
            {{ appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1) }}
          </Badge>
        </div>
      </div>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Customer Info -->
      <div class="rounded-lg bg-slate-50 p-3 space-y-2">
        <div>
          <div class="text-xs font-medium text-slate-600 mb-1">Customer</div>
          <div class="text-sm font-semibold text-slate-900">
            {{ appointment.custFirstName }} {{ appointment.custLastName }}
          </div>
          <div v-if="appointment.custPhone" class="text-xs text-slate-600 mt-1">
            {{ formatPhone(appointment.custPhone) }}
          </div>
          <div v-if="appointment.custEmail" class="text-xs text-slate-600">
            {{ appointment.custEmail }}
          </div>
        </div>
        <div v-if="appointment.custAddress" class="text-xs text-slate-600 pt-2 border-t border-slate-200">
          <div>{{ appointment.custAddress }}</div>
          <div v-if="appointment.custCity || appointment.custState || appointment.custZip">
            {{ [appointment.custCity, appointment.custState, appointment.custZip].filter(Boolean).join(', ') }}
          </div>
        </div>
      </div>

      <!-- Vehicle Info -->
      <div v-if="hasVehicleInfo" class="rounded-lg bg-slate-50 p-3 space-y-2">
        <div class="text-xs font-medium text-slate-600 mb-1">Vehicle</div>
        <div class="text-sm font-semibold text-slate-900">
          {{ formatVehicleInfo() }}
        </div>
        <div v-if="appointment.vehTag" class="text-xs text-slate-600">
          License: {{ appointment.vehTag }}
        </div>
        <div v-if="appointment.vehMileage" class="text-xs text-slate-600">
          Mileage: {{ formatMileage(appointment.vehMileage) }}
        </div>
        <div v-if="appointment.vehVin" class="text-xs text-slate-600">
          VIN: {{ appointment.vehVin }}
        </div>
      </div>

      <!-- Reason(s) for Repair -->
      <div class="space-y-2">
        <div class="text-xs font-medium text-slate-600">Reason(s) for Repair</div>
        <div class="text-sm text-slate-900">
          {{ appointment.apptDescription || '—' }}
        </div>
        <div v-if="appointment.comment" class="text-xs text-slate-600 italic mt-1">
          "{{ appointment.comment }}"
        </div>
      </div>

      <!-- Action Buttons -->
      <div v-if="appointment.status === 'pending'" class="flex flex-col gap-2 pt-2 border-t">
        <div class="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            @click="() => $emit('approve', appointment)"
            class="min-h-[44px] h-11 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent border-brand-accent/30"
          >
            <PhCheckCircle :size="16" weight="regular" class="mr-1 sm:mr-2" />
            <span class="text-xs sm:text-sm">Approve</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            @click="() => $emit('decline', appointment)"
            class="min-h-[44px] h-11 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
          >
            <PhX :size="16" weight="regular" class="mr-1 sm:mr-2" />
            <span class="text-xs sm:text-sm">Decline</span>
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from './ui/Card.vue'
import CardContent from './ui/CardContent.vue'
import CardHeader from './ui/CardHeader.vue'
import Button from './ui/Button.vue'
import Badge from './ui/Badge.vue'
import { PhCheckCircle, PhX } from '@phosphor-icons/vue'
import type { AppointmentRequest } from '@/api/appointments'
import { cn } from '@/lib/utils'

interface Props {
  appointment: AppointmentRequest
}

const props = defineProps<Props>()

const _emit = defineEmits<{
  approve: [appointment: AppointmentRequest]
  decline: [appointment: AppointmentRequest]
}>()

const hasVehicleInfo = computed(() => {
  return !!(props.appointment.vehMake || props.appointment.vehModel || props.appointment.vehYear || props.appointment.vehTag)
})

const formatAppointmentDate = (dateStr: string): string => {
  // Convert MM/DD/YYYY to readable format
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const date = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`)
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  }
  return dateStr
}

const formatAppointmentTime = (time: number): string => {
  // Convert HHMM format (e.g., 1400) to readable time (e.g., "2:00 PM")
  const hours = Math.floor(time / 100)
  const minutes = time % 100
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

const formatPhone = (phone: string): string => {
  // Format phone number: 5551234567 -> (555) 123-4567
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

const formatVehicleInfo = (): string => {
  const parts = [
    props.appointment.vehYear,
    props.appointment.vehMake,
    props.appointment.vehModel,
  ].filter(Boolean)
  return parts.join(' ') || '—'
}

const formatMileage = (mileage: number): string => {
  return new Intl.NumberFormat('en-US').format(mileage)
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved':
      return 'bg-brand-accent/15 text-brand-accent border-brand-accent/30'
    case 'declined':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'pending':
    default:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  }
}
</script>
