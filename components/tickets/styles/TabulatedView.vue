<template>
  <div :class="['space-y-4', contentStyle === 'table' ? 'flex w-full flex-col items-center' : 'w-full']">
    <div :class="[contentStyle === 'table' ? 'w-fit max-w-full' : 'w-full']">
      <!-- Underline tab strip (page canvas; no outer white panel) -->
      <div
        class="flex min-w-0 justify-between gap-3 border-b border-border max-sm:items-center sm:items-end"
      >
        <!-- Horizontal scroll only: overflow-x-auto must not create a vertical scroll track on mobile -->
        <div
          class="flex min-h-0 min-w-0 flex-1 items-center overflow-x-auto overflow-y-hidden"
        >
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          @click="activeTab = tab.key"
          :class="[
            '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
            activeTab === tab.key
              ? 'border-brand-accent text-brand-accent'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          ]"
        >
          <span>{{ tab.label }}</span>
          <Badge
            variant="outline"
            :class="[
              'border-transparent text-xs font-semibold',
              activeTab === tab.key
                ? 'bg-brand-accent/15 text-brand-accent dark:text-white'
                : 'bg-muted text-muted-foreground',
            ]"
          >
            {{ tab.count }}
          </Badge>
        </button>
      </div>
        <div
          class="hidden shrink-0 self-center pb-3 pl-2 text-sm text-muted-foreground whitespace-nowrap sm:block"
        >
          {{ tickets.length }} ticket{{ tickets.length === 1 ? '' : 's' }}
        </div>
      </div>

      <!-- Tab content: spacing only; cards/table bring their own surfaces -->
      <div class="pt-4">
        <div v-if="activeTabTickets.length === 0" class="text-center py-8">
          <p class="text-muted-foreground">No tickets in this category</p>
        </div>

      <CardStyle
        v-else-if="contentStyle === 'card'"
        :tickets="activeTabTickets"
        :visible-field-keys="cardVisibleFieldKeys"
        :fields-by-category="cardFieldsByCategory"
        :loading-ticket-number="loadingTicketNumber"
        :view-status-update-trigger="viewStatusUpdateTrigger"
        :inspection-view-update-trigger="inspectionViewUpdateTrigger"
        :approval-update-trigger="approvalUpdateTrigger"
        :can-view-cost="canViewCost"
        :can-chat="canChat"
        :view-meta="progressViewMeta"
        :ticket-action-visibility="ticketActionVisibility"
        @view="$emit('view', $event)"
        @open-view-panel="$emit('open-view-panel', $event)"
        @chat="(ticket, anchor) => $emit('chat', ticket, anchor)"
        @timeline="$emit('timeline', $event)"
        @approvals="$emit('approvals', $event)"
        @edit-status="$emit('edit-status', $event)"
        @inspection="$emit('inspection', $event)"
        @action="(t, a) => $emit('action', t, a)"
        @update="(id, updates) => $emit('update', id, updates)"
      />

      <TableStyle
        v-else-if="contentStyle === 'table'"
        :tickets="activeTabTickets"
        :visible-column-keys="tableVisibleColumns"
        :loading-ticket-number="loadingTicketNumber"
        :view-status-update-trigger="viewStatusUpdateTrigger"
        :inspection-view-update-trigger="inspectionViewUpdateTrigger"
        :approval-update-trigger="approvalUpdateTrigger"
        :can-view-cost="canViewCost"
        :can-chat="canChat"
        :view-meta="progressViewMeta"
        :ticket-action-visibility="ticketActionVisibility"
        @view="$emit('view', $event)"
        @open-view-panel="$emit('open-view-panel', $event)"
        @chat="(ticket, anchor) => $emit('chat', ticket, anchor)"
        @timeline="$emit('timeline', $event)"
        @approvals="$emit('approvals', $event)"
        @inspection="$emit('inspection', $event)"
        @action="(t, a) => $emit('action', t, a)"
        @update="(id, updates) => $emit('update', id, updates)"
        @reorder="$emit('reorder', $event)"
      />

      <ProgressStyle
        v-else-if="contentStyle === 'progress'"
        :tickets="activeTabTickets"
        :sort-by="progressSortBy"
        :view-meta="progressViewMeta"
        :visible-fields="progressVisibleFields"
        :view-status-update-trigger="viewStatusUpdateTrigger"
        :inspection-view-update-trigger="inspectionViewUpdateTrigger"
        :approval-update-trigger="approvalUpdateTrigger"
        :can-view-cost="canViewCost"
        :can-chat="canChat"
        :ticket-action-visibility="ticketActionVisibility"
        @update:sort-by="$emit('update:sortBy', $event)"
        @view="$emit('view', $event)"
        @open-view-panel="$emit('open-view-panel', $event)"
        @chat="(ticket, anchor) => $emit('chat', ticket, anchor)"
        @inspection="$emit('inspection', $event)"
        @timeline="$emit('timeline', $event)"
        @approvals="$emit('approvals', $event)"
        @action="(t, a) => $emit('action', t, a)"
        @status-change="(id, status) => $emit('status-change', id, status)"
      />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Badge from '@/components/ui/Badge.vue'
import CardStyle from './CardStyle.vue'
import TableStyle from './TableStyle.vue'
import ProgressStyle from './ProgressStyle.vue'
import { useTabulateTickets } from '@/composables/useTabulateTickets'
import type {
  Ticket,
  TabulationDimension,
  TicketStatusMeta,
  DisplayFieldConfig,
  DisplayFieldCategory,
  TicketActionVisibility,
} from '@/types/ticket'
import { DEFAULT_TICKET_ACTION_VISIBILITY } from '@/types/ticket'
import type { ProgressSortOption } from '@/types/ticket'

interface Props {
  tickets: Ticket[]
  tabulateBy: TabulationDimension
  contentStyle: 'table' | 'card' | 'progress'
  tableVisibleColumns?: string[]
  cardVisibleFieldKeys?: string[]
  cardFieldsByCategory?: Partial<Record<DisplayFieldCategory, DisplayFieldConfig[]>>
  progressSortBy?: ProgressSortOption
  progressViewMeta?: Record<number, TicketStatusMeta>
  progressVisibleFields?: string[]
  loadingTicketNumber?: number | null
  viewStatusUpdateTrigger?: number
  inspectionViewUpdateTrigger?: number
  approvalUpdateTrigger?: number
  canViewCost?: boolean
  canChat?: boolean
  ticketActionVisibility?: TicketActionVisibility
}

const props = withDefaults(defineProps<Props>(), {
  tableVisibleColumns: () => [],
  cardVisibleFieldKeys: () => [],
  cardFieldsByCategory: () => ({}),
  progressSortBy: 'readyFirst',
  progressViewMeta: () => ({}),
  progressVisibleFields: () => [],
  canViewCost: true,
  canChat: true,
  ticketActionVisibility: () => ({ ...DEFAULT_TICKET_ACTION_VISIBILITY }),
})

defineEmits<{
  view: [ticket: Ticket]
  'open-view-panel': [ticket: Ticket]
  chat: [ticket: Ticket, anchor?: MouseEvent]
  timeline: [ticket: Ticket]
  approvals: [ticket: Ticket]
  'edit-status': [ticket: Ticket]
  inspection: [ticket: Ticket]
  update: [ticketId: number, updates: { vehicleStatus?: string; inspectionId?: string }]
  action: [ticket: Ticket, action: string]
  'status-change': [ticketId: number, status: string]
  'update:sortBy': [value: ProgressSortOption]
  reorder: [orderedColumnKeys: string[]]
}>()

const { tabs, activeTab, activeTabTickets } = useTabulateTickets(
  () => props.tickets,
  () => props.tabulateBy,
  () => props.progressViewMeta
)
</script>
