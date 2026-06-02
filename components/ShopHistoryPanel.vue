<template>
  <div class="flex flex-col">
    <!-- Current ticket: above shop history header, highlighted -->
    <button
      v-if="currentTicket"
      type="button"
      :class="[
        'w-full text-left px-4 pt-4 pb-3 rounded-t-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        selectedTicketNumber === null
          ? 'border-brand-accent bg-brand-accent/15 ring-1 ring-brand-accent/30'
          : 'border-slate-200 bg-slate-50 hover:border-brand-accent/50 hover:bg-brand-accent/5'
      ]"
      :aria-label="`View current ${getTypeLabel(currentTicket.type)} ${currentTicket.ticketNumber}`"
      :aria-current="selectedTicketNumber === null ? 'true' : undefined"
      @click="$emit('select-invoice', currentTicket.ticketNumber)"
    >
      <div class="min-w-0">
        <h4 class="text-sm font-semibold text-slate-900">
          Current {{ getTypeLabel(currentTicket.type) }} #{{ currentTicket.ticketNumber }}
        </h4>
        <p class="text-xs text-slate-600 mt-1">{{ currentTicket.date }}</p>
        <p class="text-xs font-medium text-slate-900 mt-1">
          {{ formatCurrency(currentTicket.total) }}
        </p>
      </div>
    </button>

    <div class="p-4">
      <h3 class="text-lg font-semibold text-slate-900">Shop History</h3>
      <p v-if="vehicleSummaryLine" class="text-xs text-slate-500 mt-1">{{ vehicleSummaryLine }}</p>
    </div>

    <div>
      <div v-if="loading" class="flex items-center justify-center py-8">
        <p class="text-slate-600 text-sm">Loading shop history...</p>
      </div>
      <div v-else-if="error" class="flex items-center justify-center py-8 px-4">
        <p class="text-red-600 text-sm text-center">{{ error }}</p>
      </div>
      <div v-else class="p-4 flex flex-col gap-3">
        <!-- Shop history list (excludes current ticket when it appears in history) -->
        <div v-if="historyEntries.length === 0" class="flex items-center justify-center py-6">
          <p class="text-slate-600 text-sm">No shop history found.</p>
        </div>
        <div v-else class="space-y-2">
          <button
            v-for="entry in historyEntries"
            :key="entry.ticket.ticketNumber"
            type="button"
            :class="[
              'w-full text-left p-3 rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              selectedTicketNumber === entry.ticket.ticketNumber
                ? 'bg-brand-accent/10 border-brand-accent ring-1 ring-brand-accent/30'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
            ]"
            :aria-label="`View ${getTypeLabel(entry.ticket.type)} ${entry.ticket.ticketNumber} from ${entry.ticket.date}`"
            :aria-current="selectedTicketNumber === entry.ticket.ticketNumber ? 'true' : undefined"
            @click="$emit('select-invoice', entry.ticket.ticketNumber)"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <h4 class="text-sm font-semibold text-slate-900">
                  {{ getTypeLabel(entry.ticket.type) }} #{{ entry.ticket.ticketNumber }}
                </h4>
                <p class="text-xs text-slate-600 mt-1">{{ entry.ticket.date }}</p>
                <p class="text-xs font-medium text-slate-900 mt-1">
                  {{ formatCurrency(entry.ticket.total) }}
                </p>
              </div>
              <div v-if="selectedTicketNumber === entry.ticket.ticketNumber" class="flex-shrink-0">
                <div class="w-2 h-2 rounded-full bg-brand-accent" aria-hidden="true"></div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ShopHistoryEntry } from '@/api/tickets'

export interface CurrentTicketSummary {
  ticketNumber: number
  type: string
  date: string
  total: string | number
}

interface Props {
  entries: ShopHistoryEntry[]
  loading: boolean
  error: string
  selectedTicketNumber: number | null
  currentTicket?: CurrentTicketSummary | null
}

const props = withDefaults(defineProps<Props>(), {
  currentTicket: null,
})

defineEmits<{
  'select-invoice': [ticketNumber: number]
}>()

const sortedEntries = computed(() => {
  return [...props.entries].sort((a, b) => {
    const parseDate = (dateStr: string): number => {
      if (!dateStr) return 0
      const parts = dateStr.split('/')
      if (parts.length !== 3) return 0
      const mm = Number(parts[0])
      const dd = Number(parts[1])
      const yyyy = Number(parts[2])
      if (!mm || !dd || !yyyy) return 0
      return new Date(yyyy, mm - 1, dd).getTime()
    }
    return parseDate(b.ticket.date) - parseDate(a.ticket.date)
  })
})

const historyEntries = computed(() => {
  const current = props.currentTicket?.ticketNumber
  if (current == null) return sortedEntries.value
  return sortedEntries.value.filter((e) => e.ticket.ticketNumber !== current)
})

const vehicleSummaryLine = computed(() => {
  const entry = props.entries[0]
  if (!entry) return ''
  const ir = entry.invoiceRow
  const ymm = [ir.AutoYear, ir.AutoMake, ir.AutoModel].filter(Boolean).join(' ').trim()
  const plate = (ir.AutoTag ?? '').trim()
  const state = (ir.AutoTagState ?? '').trim()
  const platePart =
    plate && state ? `${plate} (${state})` : plate || state ? (plate || state) : ''
  const parts = [ymm, platePart].filter(Boolean)
  return parts.join(' · ') || ''
})

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'W':
      return 'Workorder'
    case 'I':
      return 'Invoice'
    case 'B':
      return 'Invoice'
    case 'Q':
      return 'Quote'
    default:
      return 'Invoice'
  }
}

const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}
</script>
