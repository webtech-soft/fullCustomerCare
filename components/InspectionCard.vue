<template>
  <Card class="overflow-hidden transition-shadow hover:shadow-md">
    <CardHeader class="pb-3">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex-1 space-y-1">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="text-lg font-semibold text-slate-900">
              Ticket #{{ ticket.ticketNumber }}
            </h3>
            <Badge variant="outline" class="text-xs">
              {{ getTypeLabel(ticket.type) }}
            </Badge>
          </div>
          <p class="text-sm text-slate-600">{{ formatDateWithTime(ticket.date) }}</p>
        </div>
        <div class="text-right">
          <Badge
            :class="cn(
              'text-xs font-semibold',
              getInspectionStatusColor(ticket.inspectionStatus || 'none')
            )"
          >
            {{ getInspectionStatusLabel(ticket.inspectionStatus || 'none') }}
          </Badge>
        </div>
      </div>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Customer Name -->
      <div v-if="ticket.name" class="rounded-lg bg-slate-50 p-3">
        <div class="text-xs font-medium text-slate-600 mb-1">
          Customer
        </div>
        <div class="text-sm font-semibold text-slate-900">
          {{ ticket.name }}
        </div>
      </div>

      <!-- Technician -->
      <div>
        <div class="text-xs font-medium text-slate-600 mb-1">
          Technician
        </div>
        <div class="text-sm text-slate-900">{{ ticket.technician || "—" }}</div>
      </div>

      <!-- Vehicle Info -->
      <div v-if="ticket.vehicle" class="rounded-lg bg-slate-50 p-3 space-y-2">
        <div class="text-xs font-medium text-slate-600 mb-2">
          Vehicle Information
        </div>
        <div class="text-sm font-semibold text-slate-900">
          {{ getVehicleInfo(ticket.vehicle) }}
        </div>
        <div v-if="licensePlate" class="text-sm text-slate-700">
          <span class="font-medium">License Plate:</span> {{ licensePlate }}
        </div>
        <div v-if="ticket.mileage" class="text-sm text-slate-700">
          <span class="font-medium">Mileage:</span> {{ formatMileage(ticket.mileage) }}
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col gap-2 pt-2 border-t">
        <div class="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            @click="() => $emit('customerView', ticket)"
            class="min-h-10"
          >
            <PhEye :size="16" weight="regular" class="mr-2" />
            <span class="hidden sm:inline">Customer View</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            @click="() => $emit('editInspection', ticket)"
            class="min-h-10"
          >
            <PhPencilSimple :size="16" weight="regular" class="mr-2" />
            <span class="hidden sm:inline">Edit Inspection</span>
          </Button>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            @click="() => $emit('sendInspection', ticket)"
            class="min-h-10"
          >
            <PhPaperPlaneTilt :size="16" weight="regular" class="mr-2" />
            <span class="hidden sm:inline">Send Inspection</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            @click="() => $emit('delete', ticket)"
            class="min-h-10 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <PhTrash :size="16" weight="regular" class="mr-2" />
            <span class="hidden sm:inline">Delete</span>
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
import { PhEye, PhPencilSimple, PhPaperPlaneTilt, PhTrash } from '@phosphor-icons/vue'
import type { Ticket } from '@/types/ticket'
import { cn } from '@/lib/utils'

interface Props {
  ticket: Ticket
}

const props = defineProps<Props>()

const getTypeLabel = (type: string) => {
  switch (type) {
    case "Q":
      return "Quote"
    case "W":
      return "Workorder"
    case "I":
      return "Invoice"
    default:
      return type
  }
}

const getInspectionStatusColor = (status: string) => {
  switch (status) {
    case "complete":
      return "bg-brand-accent/15 text-brand-accent border-brand-accent/30"
    case "incomplete":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

const getInspectionStatusLabel = (status: string) => {
  switch (status) {
    case "complete":
      return "Complete"
    case "incomplete":
      return "In Progress"
    default:
      return "Not Started"
  }
}

const formatDateWithTime = (date: string) => {
  // Date is in MM/DD/YYYY format
  // For now, just show the date. Time can be added later if available
  return date
}

const formatMileage = (mileage: number) => {
  return mileage.toLocaleString()
}

// Extract license plate from vehicle string (format: "MAKE MODEL YEAR (TAG)")
const licensePlate = computed(() => {
  if (!props.ticket.vehicle) return ''
  const match = props.ticket.vehicle.match(/\(([^)]+)\)/)
  return match ? match[1] : ''
})

// Get vehicle info without license plate
const getVehicleInfo = (vehicle: string) => {
  if (!vehicle) return ''
  // Remove the license plate part (everything in parentheses)
  return vehicle.replace(/\s*\([^)]+\)\s*$/, '').trim()
}

defineEmits<{
  customerView: [ticket: Ticket]
  editInspection: [ticket: Ticket]
  sendInspection: [ticket: Ticket]
  delete: [ticket: Ticket]
}>()
</script>

