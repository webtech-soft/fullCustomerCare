<template>
  <div class="w-fit max-w-full bg-card rounded-lg border border-border">
    <p
      v-show="showTopScrollbar"
      class="sm:hidden text-xs text-muted-foreground px-3 pt-2 pb-0"
    >
      Scroll horizontally to see all columns.
    </p>
    <!-- Top horizontal scrollbar (small screens when table overflows) -->
    <div
      v-show="showTopScrollbar"
      ref="tableScrollbarTopRef"
      class="overflow-x-auto overflow-y-hidden border-b border-border bg-muted shrink-0 max-w-full"
      style="height: 14px;"
      @scroll="syncScrollFromTop"
    >
      <div :style="{ width: tableScrollWidth + 'px', height: '1px' }" aria-hidden="true" />
    </div>
    <div
      ref="tableScrollRef"
      :class="['w-fit max-w-full overflow-x-auto', showTopScrollbar ? 'tickets-table-scrollbar-top-only' : '']"
      @scroll="syncScrollFromTable"
    >
      <table class="min-w-max w-max table-auto">
      <thead class="sticky top-0 z-10 bg-muted border-b border-border shadow-sm">
        <tr>
          <th
            v-for="(column, colIndex) in visibleColumns"
            :key="column.key"
            scope="col"
            :class="[
              'px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider',
              column.sortable !== false ? 'select-none' : '',
              colIndex === 0 ? 'tickets-table-sticky-col bg-muted' : '',
              dropTargetIndex === colIndex ? 'tickets-table-drop-target' : ''
            ]"
            :aria-sort="
              column.sortable === false
                ? undefined
                : sortColumn === column.key
                  ? sortDirection === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
            "
            @dragover.prevent="handleHeaderDragOver(colIndex)"
            @dragleave="handleHeaderDragLeave"
            @drop.prevent="handleHeaderDrop(colIndex)"
          >
            <div class="flex items-center gap-2">
              <div
                class="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none shrink-0"
                draggable="true"
                @click.stop
                @dragstart="handleHeaderDragStart($event, colIndex)"
                @dragend="handleHeaderDragEnd"
              >
                <PhDotsSixVertical :size="14" weight="bold" />
              </div>
              <button
                v-if="column.sortable !== false"
                type="button"
                class="inline-flex items-center gap-1 rounded-sm -mx-1 px-1 py-0.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted"
                @click="handleSort(column.key)"
              >
                <span>{{ column.label }}</span>
                <span v-if="sortColumn === column.key" class="text-muted-foreground" aria-hidden="true">
                  <PhCaretUp v-if="sortDirection === 'asc'" :size="12" weight="bold" />
                  <PhCaretDown v-else :size="12" weight="bold" />
                </span>
              </button>
              <span v-else class="inline-flex items-center gap-1">
                <span>{{ column.label }}</span>
              </span>
            </div>
          </th>
          <th
            v-if="showActionsColumn"
            scope="col"
            class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            Actions
          </th>
        </tr>
      </thead>
      <tbody class="bg-card divide-y divide-border">
        <tr
          v-for="(ticket, rowIndex) in sortedTickets"
          :key="ticket.id"
          class="group transition-colors"
          @dblclick="handleRowDblClick(ticket, $event)"
        >
          <td v-for="(column, colIndex) in visibleColumns" :key="column.key" :class="['px-4 py-3 whitespace-nowrap', colIndex === 0 ? 'tickets-table-sticky-col bg-card group-hover:bg-muted/80' : '']">
            <template v-if="column.key === 'ticketNumber'">
              <div class="text-sm font-semibold text-foreground">#{{ ticket.ticketNumber }}</div>
            </template>
            <template v-else-if="column.key === 'type'">
              <Badge variant="outline" class="text-xs">
                {{ getTypeLabel(ticket.type) }}
              </Badge>
            </template>
            <template v-else-if="column.key === 'date'">
              <div class="text-sm text-foreground">{{ ticket.date }}</div>
            </template>
            <template v-else-if="column.key === 'total'">
              <div class="text-sm font-semibold text-foreground">{{ canViewCost ? formatCurrency(ticket.total) : '—' }}</div>
            </template>
            <template v-else-if="column.key === 'gpPercent'">
              <div class="text-sm text-foreground">
                {{
                  canViewCost && typeof ticket.gpPercent === 'number'
                    ? formatPercent(ticket.gpPercent)
                    : '—'
                }}
              </div>
            </template>
            <template v-else-if="column.key === 'name'">
              <div class="text-sm text-foreground">{{ ticket.name || "—" }}</div>
            </template>
            <template v-else-if="column.key === 'vehicle'">
              <div class="text-sm text-foreground">{{ ticket.vehicle || "—" }}</div>
            </template>
            <template v-else-if="column.key === 'salesrep'">
              <div class="text-sm text-foreground">{{ ticket.salesrep || "—" }}</div>
            </template>
            <template v-else-if="column.key === 'technician'">
              <div class="text-sm text-foreground">{{ ticket.technician || "—" }}</div>
            </template>
            <template v-else-if="column.key === 'vehicleStatus'">
              <div class="relative" :ref="(el) => setStatusRef(ticket.id, el)">
                <button
                  type="button"
                  class="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  :aria-expanded="activeStatusPopover === ticket.id"
                  aria-haspopup="true"
                  :aria-controls="`table-status-popover-${ticket.id}`"
                  :aria-label="`Vehicle status: ${ticket.vehicleStatus || 'Not Started'}. Change status`"
                  @click="toggleStatusPopover(ticket.id)"
                  @dblclick.stop
                >
                  <Badge
                    :class="cn(
                      'text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity',
                      getVehicleStatusColor(ticket.vehicleStatus || 'Not Started')
                    )"
                  >
                    {{ ticket.vehicleStatus || 'Not Started' }}
                  </Badge>
                </button>
                <Teleport to="body">
                  <div
                    v-if="activeStatusPopover === ticket.id"
                    :ref="(el) => setPopoverRef(ticket.id, el)"
                    :id="`table-status-popover-${ticket.id}`"
                    class="fixed z-[100] w-56 max-w-sm rounded-md border border-border bg-popover p-1 overflow-hidden shadow-lg"
                    :style="getPopoverStyle(ticket.id)"
                  >
                    <div class="space-y-1 overflow-y-auto max-h-80">
                      <button
                        v-for="status in VEHICLE_STATUSES"
                        :key="status"
                        @click="handleVehicleStatusChange(ticket.id, status)"
                        :class="cn(
                          'w-full text-left px-3 py-2 text-sm rounded-md transition-colors',
                          status === (ticket.vehicleStatus || 'Not Started')
                            ? 'bg-accent text-accent-foreground font-medium'
                            : 'hover:bg-accent hover:text-accent-foreground'
                        )"
                      >
                        {{ status }}
                      </button>
                    </div>
                  </div>
                </Teleport>
              </div>
            </template>
            <template v-else-if="column.key === 'statusFlags'">
              <div class="flex flex-wrap items-center gap-1">
                <Badge
                  v-if="getStatusFlagsForTicket(ticket).isOverdue"
                  class="text-[10px] px-1.5 py-0.5 font-semibold bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/45 dark:text-red-300 dark:border-red-900 uppercase tracking-wide"
                >
                  Overdue
                </Badge>
                <Badge
                  v-if="getStatusFlagsForTicket(ticket).inspectionStarted && !getStatusFlagsForTicket(ticket).inspectionComplete"
                  class="text-[10px] px-1.5 py-0.5 font-semibold bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/45 dark:text-amber-300 dark:border-amber-900 uppercase tracking-wide"
                >
                  Insp. Started
                </Badge>
                <Badge
                  v-if="getStatusFlagsForTicket(ticket).inspectionComplete"
                  class="text-[10px] px-1.5 py-0.5 font-semibold bg-brand-accent/15 text-brand-accent border border-brand-accent/30 dark:bg-brand-accent/25 dark:text-white dark:border-brand-accent/45 uppercase tracking-wide"
                >
                  Insp. Complete
                </Badge>
              </div>
            </template>
            <template v-else-if="column.key === 'approvedStatus'">
              <Badge
                v-if="getStatusFlagsForTicket(ticket).isApproved"
                class="text-[10px] px-1.5 py-0.5 font-semibold bg-brand-accent/15 text-brand-accent border border-brand-accent/30 dark:bg-brand-accent/25 dark:text-white dark:border-brand-accent/45 uppercase tracking-wide"
              >
                Approved
              </Badge>
            </template>
            <template v-else-if="column.key === 'viewedStatus'">
              <Badge
                v-if="getStatusFlagsForTicket(ticket).isViewed"
                class="text-[10px] px-1.5 py-0.5 font-semibold bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-950/45 dark:text-sky-300 dark:border-sky-900 uppercase tracking-wide"
              >
                Viewed
              </Badge>
            </template>
            <template v-else-if="column.key === 'ticketAgeLabel'">
              <div
                class="text-sm"
                :class="ticket.ticketAgeMinutes != null && ticket.ticketAgeMinutes >= 480 ? 'text-red-700 font-semibold' : 'text-foreground'"
              >
                {{ ticket.ticketAgeLabel || '—' }}
              </div>
            </template>
            <template v-else-if="column.key === 'timeUntilDueLabel'">
              <div
                class="text-sm"
                :class="ticket.timeUntilPromiseMinutes != null && ticket.timeUntilPromiseMinutes < 0
                  ? 'text-red-700 font-semibold'
                  : 'text-foreground'"
              >
                {{ ticket.timeUntilDueLabel || ticket.timeUntilPromiseLabel || '—' }}
              </div>
            </template>
            <template v-else-if="column.key === 'overdueTimeLabel'">
              <div
                class="text-sm"
                :class="ticket.promiseOverdueByMinutes != null && ticket.promiseOverdueByMinutes > 0
                  ? 'text-red-700 font-semibold'
                  : 'text-foreground'"
              >
                {{ ticket.overdueTimeLabel || ticket.promiseOverdueByLabel || '—' }}
              </div>
            </template>
            <template v-else-if="column.key === 'readyForLabel'">
              <div
                class="text-sm"
                :class="ticket.readyForMinutes != null && ticket.readyForMinutes >= 480
                  ? 'text-amber-700 font-semibold'
                  : 'text-foreground'"
              >
                {{ ticket.readyForLabel || '—' }}
              </div>
            </template>
            <template v-else-if="column.key === 'timeSinceCheckInLabel'">
              <div
                class="text-sm"
                :class="ticket.timeSinceCheckInMinutes != null && ticket.timeSinceCheckInMinutes >= 60
                  ? 'text-amber-700 font-semibold'
                  : 'text-foreground'"
              >
                {{ ticket.timeSinceCheckInLabel || '—' }}
              </div>
            </template>
            <template v-else-if="column.key === 'serviceCycleTimeLabel'">
              <div
                class="text-sm"
                :class="ticket.serviceCycleTimeMinutes != null && ticket.serviceCycleTimeMinutes >= 480
                  ? 'text-red-700 font-semibold'
                  : 'text-foreground'"
              >
                {{ ticket.serviceCycleTimeLabel || '—' }}
              </div>
            </template>
            <template v-else-if="column.key === 'inspectionCompletionLabel'">
              <div
                class="text-sm"
                :class="ticket.inspectionCompletionMinutes != null && ticket.inspectionCompletionMinutes >= 60
                  ? 'text-amber-700 font-semibold'
                  : 'text-foreground'"
              >
                {{ ticket.inspectionCompletionLabel || '—' }}
              </div>
            </template>
            <template v-else>
              <div class="text-sm text-foreground">{{ getFieldValue(ticket, column.key) }}</div>
            </template>
          </td>
          <td
            v-if="showActionsColumn"
            class="px-4 py-3 whitespace-nowrap"
            :data-onboarding="rowActionsOnboardingAttr(ticket, rowIndex)"
          >
            <div class="flex items-center gap-2" @dblclick.stop>
              <Button
                v-if="ticketActionVisibility.nextStep && getNextAction(ticket)"
                variant="outline"
                size="sm"
                type="button"
                class="h-9 w-9 p-0 shrink-0 flex items-center justify-center"
                :title="`Next step: ${getNextAction(ticket)!.label}`"
                :aria-label="`Next step: ${getNextAction(ticket)!.label}`"
                @click="handleNextStepClick(ticket)"
              >
                <!-- PhSteps unavailable in @phosphor-icons/vue 2.2 — forward / “do next” cue -->
                <PhCaretCircleRight :size="14" weight="regular" />
              </Button>
              <Button
                v-if="canViewCost && ticketActionVisibility.view"
                variant="outline"
                size="sm"
                @click="handleViewClick(ticket)"
                :disabled="loadingTicketNumber === ticket.ticketNumber || ticket.total === 0"
                :class="[
                  'h-9',
                  getViewButtonClassName(ticket)
                ]"
              >
                <PhEye v-if="loadingTicketNumber !== ticket.ticketNumber" :size="14" weight="regular" />
                <span v-else class="w-3.5 h-3.5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin inline-block" />
              </Button>
              <Button
                v-if="canChat && ticketActionVisibility.chat"
                variant="outline"
                size="sm"
                @click="$emit('chat', ticket, $event)"
                :class="['h-9', tourDemoChatAccentClass(ticket)]"
              >
                <PhChatCircle :size="14" weight="regular" />
              </Button>
              <Button
                v-if="ticketActionVisibility.inspection"
                size="sm"
                :variant="getInspectionButtonProps(ticket.inspectionStatus).variant"
                @click="$emit('inspection', ticket)"
                :class="cn('h-9', getInspectionActionButtonClass(ticket))"
              >
                <PhClipboardText :size="14" weight="regular" />
              </Button>
              <Button
                v-if="ticketActionVisibility.timeline"
                variant="outline"
                size="sm"
                type="button"
                class="h-9"
                title="Timeline"
                @click="handleTimelineClick(ticket)"
              >
                <PhClockCounterClockwise :size="14" weight="regular" />
              </Button>
              <Button
                v-if="ticketActionVisibility.approvals"
                variant="outline"
                size="sm"
                type="button"
                :class="['h-9', getApprovalsButtonClass(ticket)]"
                title="Approvals"
                @click="handleApprovalsClick(ticket)"
              >
                <PhSealCheck :size="14" weight="regular" />
              </Button>
              <Button
                v-if="ticketActionVisibility.technicianWorksheet"
                variant="outline"
                size="sm"
                type="button"
                class="h-9 w-9 p-0 shrink-0 flex items-center justify-center"
                title="Technician Worksheet"
                aria-label="Technician Worksheet"
                @click="$emit('action', ticket, 'technicianWorksheet')"
              >
                <PhWrench :size="14" weight="regular" />
              </Button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, onBeforeUnmount, nextTick } from 'vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import { PhCaretUp, PhCaretDown, PhEye, PhChatCircle, PhClipboardText, PhDotsSixVertical, PhClockCounterClockwise, PhCaretCircleRight, PhSealCheck, PhWrench } from '@phosphor-icons/vue'
import type { Ticket, TicketStatusMeta, TicketActionVisibility } from '@/types/ticket'
import {
  DISPLAY_FIELDS,
  DEFAULT_TABLE_COLUMNS,
  DEFAULT_TICKET_ACTION_VISIBILITY,
  FINANCIAL_FIELD_KEYS,
} from '@/types/ticket'
import { cn } from '@/lib/utils'
import { vehicleStatusBadgeClass } from '@/lib/vehicle-status-badge-classes'
import { getTicketStatusFlags, type DerivedStatusFlags } from '@/utils/ticketStatus'
import { useApprovalsActionButtonState } from '@/composables/useApprovalsActionButtonState'
import { useInspectionViewButtonState } from '@/composables/useInspectionViewButtonState'
import { useViewButtonState, VIEW_BUTTON_SOLID_VIEWED_CLASS } from '@/composables/useViewButtonState'
import { getNextAction } from '@/utils/ticketNextAction'
import {
  TOUR_DEMO_APPROVALS_SOLID_GREEN_CLASS,
  TOUR_DEMO_ROW_ACTION_ACCENT_CLASS,
} from '@/lib/tickets-tour-demo'

interface ColumnConfig {
  key: string
  label: string
  sortable?: boolean
}

interface Props {
  tickets: Ticket[]
  visibleColumnKeys?: string[]
  loadingTicketNumber?: number | null
  viewStatusUpdateTrigger?: number
  inspectionViewUpdateTrigger?: number
  approvalUpdateTrigger?: number
  canViewCost?: boolean
  canChat?: boolean
  viewMeta?: Record<number, TicketStatusMeta>
  ticketActionVisibility?: TicketActionVisibility
}

const props = withDefaults(defineProps<Props>(), {
  visibleColumnKeys: () => [...DEFAULT_TABLE_COLUMNS],
  canViewCost: true,
  canChat: true,
  viewMeta: () => ({}),
  ticketActionVisibility: () => ({ ...DEFAULT_TICKET_ACTION_VISIBILITY }),
})

const ticketActionVisibility = computed(() => props.ticketActionVisibility ?? DEFAULT_TICKET_ACTION_VISIBILITY)

const hasAdvActionSignalsAnchor = computed(() =>
  props.tickets.some((t) => t.tourDemoAdvActionSignalsAnchor),
)

function rowActionsOnboardingAttr(ticket: Ticket, rowIndex: number): 'ticket-row-actions' | undefined {
  if (ticket.tourDemoAdvActionSignalsAnchor) return 'ticket-row-actions'
  if (!hasAdvActionSignalsAnchor.value && rowIndex === 0) return 'ticket-row-actions'
  return undefined
}

const dataColumnKeys = computed(() => props.visibleColumnKeys.filter((k) => k !== 'actions'))

const showActionsColumn = computed(() => {
  if (!props.visibleColumnKeys.includes('actions')) return false
  const v = ticketActionVisibility.value
  if (v.view && props.canViewCost) return true
  if (v.chat && props.canChat) return true
  if (v.timeline) return true
  if (v.approvals) return true
  if (v.inspection) return true
  if (v.nextStep) return true
  if (v.technicianWorksheet) return true
  return false
})

const emit = defineEmits<{
  view: [ticket: Ticket]
  'open-view-panel': [ticket: Ticket]
  chat: [ticket: Ticket, anchor?: MouseEvent]
  timeline: [ticket: Ticket]
  approvals: [ticket: Ticket]
  inspection: [ticket: Ticket]
  action: [ticket: Ticket, action: string]
  update: [ticketId: number, updates: { vehicleStatus?: string }]
  sort: [column: string, direction: 'asc' | 'desc']
  reorder: [orderedColumnKeys: string[]]
}>()

const { getApprovalsActionButtonClass, markApprovalsActionFlashDismissed } =
  useApprovalsActionButtonState(() => props.approvalUpdateTrigger)
const { getViewButtonClass, dismissViewButtonFlash } = useViewButtonState(() => props.viewStatusUpdateTrigger)
const { getInspectionViewButtonClass } = useInspectionViewButtonState(() => props.inspectionViewUpdateTrigger)

function getInspectionActionButtonClass(ticket: Ticket): string {
  const base = getInspectionButtonProps(ticket.inspectionStatus).className
  if (ticket.inspectionStatus !== 'complete') return base
  return cn(base, getInspectionViewButtonClass(ticket.ticketNumber))
}

function tourDemoChatAccentClass(ticket: Ticket): string {
  if (ticket.tourDemoRowActionAccent !== 'chat') return ''
  return cn(
    TOUR_DEMO_ROW_ACTION_ACCENT_CLASS,
    ticket.tourDemoChatActionPulse ? 'animate-pulse' : '',
  )
}

function getApprovalsButtonClass(ticket: Ticket): string {
  if (ticket.tourDemoApprovalsSolidGreen) return TOUR_DEMO_APPROVALS_SOLID_GREEN_CLASS
  if (ticket.tourDemoRowActionAccent === 'approvals') {
    return TOUR_DEMO_ROW_ACTION_ACCENT_CLASS
  }
  return getApprovalsActionButtonClass(ticket.ticketNumber)
}

function handleTimelineClick(ticket: Ticket) {
  emit('timeline', ticket)
}

function handleApprovalsClick(ticket: Ticket) {
  markApprovalsActionFlashDismissed(ticket.ticketNumber)
  emit('approvals', ticket)
}

function getViewButtonClassName(ticket: Ticket): string {
  if (ticket.tourDemoInvoiceViewed) return VIEW_BUTTON_SOLID_VIEWED_CLASS
  return getViewButtonClass(ticket.ticketNumber)
}

function handleViewClick(ticket: Ticket) {
  dismissViewButtonFlash(ticket.ticketNumber)
  emit('view', ticket)
}

function handleRowDblClick(ticket: Ticket, e: MouseEvent) {
  const el = e.target as HTMLElement | null
  if (el?.closest('button, a, [role="button"]')) return
  if (!props.canViewCost || !ticketActionVisibility.value.view) return
  if (props.loadingTicketNumber === ticket.ticketNumber) return
  dismissViewButtonFlash(ticket.ticketNumber)
  emit('open-view-panel', ticket)
}

function handleNextStepClick(ticket: Ticket) {
  const next = getNextAction(ticket)
  if (next) emit('action', ticket, next.action)
}

const VEHICLE_STATUSES = [
  "Not Started",
  "Online Appointment",
  "Not Here Yet",
  "Check In",
  "On Lot",
  "In Shop",
  "Inspection Complete",
  "Awaiting Callback",
  "Awaiting Parts",
  "Out For Sublet",
  "Ready",
] as const

const sortColumn = ref<string>('ticketNumber')
const sortDirection = ref<'asc' | 'desc'>('desc')
const activeStatusPopover = ref<number | null>(null)

const draggedColumnIndex = ref<number | null>(null)
const dropTargetIndex = ref<number | null>(null)
const statusRefs = ref<Map<number, HTMLElement>>(new Map())
const popoverRefs = ref<Map<number, HTMLElement>>(new Map())

// Table horizontal scroll: top scrollbar when content overflows
const tableScrollRef = ref<HTMLDivElement | null>(null)
const tableScrollbarTopRef = ref<HTMLDivElement | null>(null)
const tableScrollWidth = ref(0)
const tableContainerClientWidth = ref(0)
let tableScrollResizeObserver: ResizeObserver | null = null

function updateTableScrollWidth() {
  const el = tableScrollRef.value
  if (el) {
    tableScrollWidth.value = el.scrollWidth
    tableContainerClientWidth.value = el.clientWidth
  }
}

const showTopScrollbar = computed(() =>
  tableScrollWidth.value > tableContainerClientWidth.value
)

function syncScrollFromTop() {
  const top = tableScrollbarTopRef.value
  const table = tableScrollRef.value
  if (top && table) table.scrollLeft = top.scrollLeft
}

function syncScrollFromTable() {
  const top = tableScrollbarTopRef.value
  const table = tableScrollRef.value
  if (top && table) top.scrollLeft = table.scrollLeft
}

watch(
  () => props.tickets,
  () => nextTick(updateTableScrollWidth),
  { deep: true, flush: 'post' }
)

onMounted(() => {
  nextTick(() => {
    const el = tableScrollRef.value
    if (el && !tableScrollResizeObserver) {
      tableScrollResizeObserver = new ResizeObserver(() => updateTableScrollWidth())
      tableScrollResizeObserver.observe(el)
      updateTableScrollWidth()
    }
  })
  // Recalculate on window resize (e.g. browser zoom) so table and top scrollbar respond
  window.addEventListener('resize', updateTableScrollWidth)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateTableScrollWidth)
  tableScrollResizeObserver?.disconnect()
  tableScrollResizeObserver = null
})

const visibleColumns = computed<ColumnConfig[]>(() => {
  return dataColumnKeys.value.map((key) => {
    const field = DISPLAY_FIELDS.find(f => f.key === key)
    return {
      key,
      label: field?.label || key,
      sortable: !['statusFlags'].includes(key)
    }
  })
})

const sortedTickets = computed(() => {
  const tickets = [...props.tickets]

  tickets.sort((a, b) => {
    const column = sortColumn.value

    const getNumericForSort = (t: Ticket): number | string => {
      switch (column) {
        case 'ticketAgeLabel':
          return t.ticketAgeMinutes ?? Number.NEGATIVE_INFINITY
        case 'timeUntilDueLabel':
          return t.timeUntilPromiseMinutes ?? Number.NEGATIVE_INFINITY
        case 'overdueTimeLabel':
          return t.promiseOverdueByMinutes ?? Number.NEGATIVE_INFINITY
        case 'readyForLabel':
          return t.readyForMinutes ?? Number.NEGATIVE_INFINITY
        case 'timeSinceCheckInLabel':
          return t.timeSinceCheckInMinutes ?? Number.NEGATIVE_INFINITY
        case 'serviceCycleTimeLabel':
          return t.serviceCycleTimeMinutes ?? Number.NEGATIVE_INFINITY
        case 'inspectionCompletionLabel':
          return t.inspectionCompletionMinutes ?? Number.NEGATIVE_INFINITY
        default:
          if (column === 'customer') {
            return t.name || ''
          }
          const raw = t[column as keyof Ticket]
          return raw == null ? '' : (raw as any)
      }
    }

    let aVal: any = getNumericForSort(a)
    let bVal: any = getNumericForSort(b)

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection.value === 'asc' ? aVal - bVal : bVal - aVal
    }

    if (aVal == null) aVal = ''
    if (bVal == null) bVal = ''

    const aStr = String(aVal).toLowerCase()
    const bStr = String(bVal).toLowerCase()
    const comparison = aStr.localeCompare(bStr)
    return sortDirection.value === 'asc' ? comparison : -comparison
  })

  return tickets
})

function handleSort(column: string) {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
  emit('sort', sortColumn.value, sortDirection.value)
}

function handleHeaderDragStart(event: DragEvent, colIndex: number) {
  draggedColumnIndex.value = colIndex
  const key = dataColumnKeys.value[colIndex]
  if (key && event.dataTransfer) {
    event.dataTransfer.setData('text/plain', key)
    event.dataTransfer.effectAllowed = 'move'
  }
}

function handleHeaderDragOver(colIndex: number) {
  if (draggedColumnIndex.value === null) return
  dropTargetIndex.value = colIndex
}

function handleHeaderDragLeave() {
  dropTargetIndex.value = null
}

function handleHeaderDrop(dropIndex: number) {
  if (draggedColumnIndex.value === null) return
  const keys = [...dataColumnKeys.value]
  const [removed] = keys.splice(draggedColumnIndex.value, 1)
  const insertIndex = dropIndex > draggedColumnIndex.value ? dropIndex - 1 : dropIndex
  keys.splice(insertIndex, 0, removed)
  const actionsOn = props.visibleColumnKeys.includes('actions')
  emit('reorder', actionsOn ? [...keys, 'actions'] : keys)
  draggedColumnIndex.value = null
  dropTargetIndex.value = null
}

function handleHeaderDragEnd() {
  draggedColumnIndex.value = null
  dropTargetIndex.value = null
}

function handleVehicleStatusChange(ticketId: number, status: string) {
  emit('update', ticketId, { vehicleStatus: status })
  activeStatusPopover.value = null
}

function toggleStatusPopover(ticketId: number) {
  activeStatusPopover.value = activeStatusPopover.value === ticketId ? null : ticketId
}

function setStatusRef(ticketId: number, el: any) {
  if (el) {
    statusRefs.value.set(ticketId, el)
  }
}

function setPopoverRef(ticketId: number, el: any) {
  if (el) {
    popoverRefs.value.set(ticketId, el)
  }
}

function getPopoverStyle(ticketId: number) {
  const statusEl = statusRefs.value.get(ticketId)
  if (!statusEl) return {}
  
  const rect = statusEl.getBoundingClientRect()
  return {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`
  }
}

function formatDurationMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—'

  const total = Math.floor(minutes)
  if (total < 60) {
    return `${total} minute${total === 1 ? '' : 's'}`
  }

  const hours = Math.floor(total / 60)
  const remainingMinutes = total % 60

  if (remainingMinutes === 0) {
    return `${hours} hour${hours === 1 ? '' : 's'}`
  }

  return `${hours} hour${hours === 1 ? '' : 's'} ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}`
}

const financialFieldKeySet = new Set<string>(FINANCIAL_FIELD_KEYS)

function getFieldValue(ticket: Ticket, key: string): string {
  if (!props.canViewCost && financialFieldKeySet.has(key)) {
    return '—'
  }
  if (key === 'viewedStatus') {
    return getStatusFlagsForTicket(ticket).isViewed ? 'Viewed' : ''
  }
  if (key === 'approvedStatus') {
    return getStatusFlagsForTicket(ticket).isApproved ? 'Approved' : ''
  }
  if (key === 'overdueTimeLabel') {
    return ticket.overdueTimeLabel ?? ticket.promiseOverdueByLabel ?? (ticket.promiseOverdueByMinutes != null ? String(ticket.promiseOverdueByMinutes) : '—')
  }
  const value = ticket[key as keyof Ticket]
  if (key === 'inspectionStatus') {
    if (value == null) return ''
    const normalized = String(value).trim().toLowerCase()
    return normalized === '' || normalized === 'none' ? '' : String(value)
  }
  if (key === 'bay') {
    if (value == null) return ''
    const trimmed = String(value).trim()
    if (
      trimmed === '' ||
      trimmed === '0' ||
      trimmed.toLowerCase() === 'no bay'
    ) {
      return ''
    }
    return trimmed
  }
  if (key === 'apptDurationMinutes' && typeof value === 'number') {
    return formatDurationMinutes(value)
  }
  if (value == null) return '—'
  if (typeof value === 'number') return String(value)
  return String(value)
}

function getStatusFlagsForTicket(ticket: Ticket): DerivedStatusFlags {
  const meta = props.viewMeta?.[ticket.id]
  return getTicketStatusFlags(ticket, meta)
}

const getVehicleStatusColor = (status: string) => vehicleStatusBadgeClass(status)

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case "Q": return "Quote"
    case "W": return "Workorder"
    case "I": return "Invoice"
    case "B": return "Batch"
    default: return type
  }
}

const getInspectionButtonProps = (status?: string) => {
  switch (status) {
    case "complete": return { variant: "default" as const, className: VIEW_BUTTON_SOLID_VIEWED_CLASS }
    case "incomplete": return { variant: "default" as const, className: "bg-yellow-500 hover:bg-yellow-600 text-white" }
    default: return { variant: "outline" as const, className: "" }
  }
}

// Close popover on outside click
onMounted(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (activeStatusPopover.value === null) return
    
    const statusEl = statusRefs.value.get(activeStatusPopover.value)
    const popoverEl = popoverRefs.value.get(activeStatusPopover.value)
    
    if (statusEl && !statusEl.contains(event.target as Node) &&
        popoverEl && !popoverEl.contains(event.target as Node)) {
      activeStatusPopover.value = null
    }
  }
  
  document.addEventListener('mousedown', handleClickOutside)
  
  onUnmounted(() => {
    document.removeEventListener('mousedown', handleClickOutside)
  })
})
</script>

<style scoped>
.tickets-table-scrollbar-top-only {
  scrollbar-width: none;
}
.tickets-table-scrollbar-top-only::-webkit-scrollbar {
  display: none;
}
.tickets-table-sticky-col {
  position: sticky;
  left: 0;
  /* Solid background + stacking above later cells (horizontal scroll). */
  box-shadow: 2px 0 4px -2px rgba(0, 0, 0, 0.08);
}
tbody .tickets-table-sticky-col {
  z-index: 2;
}
thead .tickets-table-sticky-col {
  z-index: 3;
}
.tickets-table-drop-target {
  border-left: 2px solid hsl(var(--brand-accent));
  margin-left: -2px;
}
</style>
