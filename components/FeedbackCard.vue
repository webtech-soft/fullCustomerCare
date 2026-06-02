<template>
  <Card class="overflow-hidden transition-shadow hover:shadow-md">
    <CardHeader class="pb-3">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex-1 space-y-1">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="text-lg font-semibold text-slate-900">
              Invoice #{{ ticket.ticketNumber }}
            </h3>
            <Badge
              v-if="isOverdue"
              class="text-xs bg-red-100 text-red-800 border-red-200"
            >
              Overdue
            </Badge>
            <Badge
              v-if="hasDeclined"
              class="text-xs bg-orange-100 text-orange-800 border-orange-200"
            >
              Declined
            </Badge>
          </div>
          <p class="text-sm text-slate-600">{{ ticket.date }}</p>
        </div>
        <div class="text-right">
          <p class="text-lg font-semibold text-slate-900">
            {{ formatCurrency(ticket.total) }}
          </p>
        </div>
      </div>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Customer and Vehicle Info -->
      <div v-if="ticket.name || ticket.vehicle" class="rounded-lg bg-slate-50 p-3 space-y-3">
        <div v-if="ticket.name">
          <div class="text-xs font-medium text-slate-600 mb-1">
            Customer
          </div>
          <div class="text-sm font-semibold text-slate-900">
            {{ ticket.name }}
          </div>
        </div>
        <div v-if="ticket.vehicle">
          <div class="text-xs font-medium text-slate-600 mb-1">
            Vehicle
          </div>
          <div class="text-sm font-semibold text-slate-900">
            {{ ticket.vehicle }}
          </div>
        </div>
      </div>

      <!-- Staff Info -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <div class="text-xs font-medium text-slate-600 mb-1">
            Salesrep
          </div>
          <div class="text-slate-900">{{ ticket.salesrep || "—" }}</div>
        </div>
        <div>
          <div class="text-xs font-medium text-slate-600 mb-1">
            Technician
          </div>
          <div class="text-slate-900">{{ ticket.technician || "—" }}</div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
        <Button
          size="sm"
          variant="default"
          class="bg-brand-accent hover:bg-brand-accent-hover text-brand-accent-foreground"
          @click="() => $emit('sendFeedback', ticket)"
        >
          <PhPaperPlaneTilt :size="16" weight="regular" class="mr-2" />
          <span class="hidden sm:inline">Send Feedback</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          @click="(e) => $emit('chat', ticket, e)"
        >
          <PhChats :size="16" weight="regular" class="mr-2" />
          <span class="hidden sm:inline">Chat</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          @click="() => $emit('view', ticket)"
        >
          <PhEye :size="16" weight="regular" class="mr-2" />
          <span class="hidden sm:inline">View</span>
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Card from './ui/Card.vue'
import CardContent from './ui/CardContent.vue'
import CardHeader from './ui/CardHeader.vue'
import Button from './ui/Button.vue'
import Badge from './ui/Badge.vue'
import { PhEye, PhChats, PhPaperPlaneTilt } from '@phosphor-icons/vue'
import type { Ticket } from '@/types/ticket'
import { isOverdue as checkIsOverdue } from '@/api/feedback'
import { fetchInvoiceDetail } from '@/api/tickets'

interface Props {
  ticket: Ticket
}

const props = defineProps<Props>()

const _emit = defineEmits<{
  sendFeedback: [ticket: Ticket]
  chat: [ticket: Ticket, anchor?: MouseEvent]
  view: [ticket: Ticket]
}>()

const isOverdue = checkIsOverdue(props.ticket)
const hasDeclined = ref(false)

// Check for declined services when component mounts
onMounted(async () => {
  try {
    const response = await fetchInvoiceDetail({
      invoiceNum: props.ticket.ticketNumber,
      includeRawData: 'false',
      includeSchema: 'false',
    })

    if (response.success && response.detailRows) {
      hasDeclined.value = response.detailRows.some((item: any) => item.Props?.IsDeclined)
    }
  } catch (error) {
    console.error('Error checking declined services:', error)
  }
})

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}
</script>
