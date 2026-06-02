<template>
  <div class="space-y-4">
    <!-- Sticky column header + step labels: md+ only (narrow screens: unreadable labels; per-row status + aria-label on segments). -->
    <div
      class="sticky top-0 z-10 hidden md:flex items-stretch gap-4 rounded-lg border border-border bg-muted px-3 py-2 shadow-sm"
    >
      <div class="w-56 min-w-[14rem] pr-2 border-r border-border flex flex-col justify-center">
        <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer / Vehicle</p>
      </div>
      <div class="flex flex-1 min-w-0 items-center gap-[2px]">
        <div v-for="status in STATUS_SEQUENCE" :key="status || 'es'" class="flex-1 min-w-0 flex justify-center">
          <span class="block truncate text-center text-[10px] font-medium text-muted-foreground" :title="status || 'Not Started'">
            {{ getStepLabel(status) }}
          </span>
        </div>
      </div>
    </div>

    <p class="md:hidden text-xs text-muted-foreground px-0.5">
      Tap the progress bar to change status.
    </p>

    <!-- Ticket rows -->
    <div
      v-for="(ticket, progressRowIdx) in sortedTickets"
      :key="ticket.id"
      class="bg-card border border-border rounded-lg px-3 py-2 flex flex-col gap-3 md:flex-row md:items-stretch md:gap-4 text-card-foreground"
      @dblclick="handleRowDblClick(ticket, $event)"
    >
      <div class="w-full min-w-0 md:w-56 md:min-w-[14rem] md:pr-2 md:border-r md:border-border flex flex-col justify-center">
        <div class="flex items-start gap-2 md:block">
          <div class="flex-1 min-w-0 space-y-0 md:space-y-0">
            <p class="text-sm font-semibold text-foreground truncate">{{ ticket.name || 'Unknown customer' }}</p>
            <p class="text-[11px] text-muted-foreground truncate">{{ ticket.vehicle || 'No vehicle info' }}</p>
          </div>
          <Button
            v-if="isNarrowProgress && showProgressCollapseToggle(ticket)"
            type="button"
            variant="ghost"
            size="sm"
            class="md:hidden shrink-0 h-9 w-9 p-0"
            :aria-expanded="isProgressRowExpanded(ticket.id)"
            :aria-controls="progressRowAriaControls(ticket.id)"
            :aria-label="isProgressRowExpanded(ticket.id) ? 'Hide ticket details' : 'Show ticket details'"
            @click.stop="toggleProgressRowExpanded(ticket.id)"
          >
            <PhCaretUp v-if="isProgressRowExpanded(ticket.id)" :size="18" weight="bold" />
            <PhCaretDown v-else :size="18" weight="bold" />
          </Button>
        </div>
        <div
          v-if="leftColumnExtraFields.length > 0"
          :id="progressExtraFieldsId(ticket.id)"
          :class="[
            'mt-0.5 md:mt-0.5',
            isNarrowProgress && !isProgressRowExpanded(ticket.id) ? 'hidden' : '',
          ]"
        >
          <div
            v-for="field in leftColumnExtraFields"
            :key="field.key"
            class="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground min-w-0"
          >
            <span
              class="truncate font-medium text-muted-foreground"
            >
              {{ field.label }}:
            </span>
            <span :class="[getTimeFieldClass(field.key, ticket) || 'text-muted-foreground', 'truncate']">
              {{ getDisplayValue(ticket, field.key) }}
            </span>
          </div>
        </div>
      </div>
      <div class="flex flex-1 min-w-0 flex-col gap-2">
        <!-- Progress bar (click a segment to set ticket status) -->
        <div class="flex items-center gap-[2px]" @dblclick.stop>
          <div
            v-for="status in STATUS_SEQUENCE"
            :key="status || 'es'"
            class="flex-1 min-w-0 cursor-pointer"
            role="button"
            tabindex="0"
            :title="`Set status to ${status || 'Not Started'}`"
            :aria-label="`Set status to ${status || 'Not Started'}`"
            @click="handleStatusChange(ticket.id, status)"
            @keydown.enter="handleStatusChange(ticket.id, status)"
            @keydown.space.prevent="handleStatusChange(ticket.id, status)"
          >
            <div :class="['h-3 rounded-full transition-colors', getSegmentClass(ticket.vehicleStatus, status)]" />
          </div>
        </div>
        <!-- Status change confirmation (dismiss on outside click or after 3s) -->
        <div
          v-if="confirmation?.ticketId === ticket.id"
          :ref="(el) => { if (el && confirmation?.ticketId === ticket.id) confirmationRef = el as HTMLElement }"
          class="rounded-md border border-brand-accent/30 bg-brand-accent/15 px-2 py-1.5 text-[11px] font-medium text-brand-accent dark:bg-brand-accent/25 dark:text-white dark:border-brand-accent/50"
        >
          Status updated to {{ confirmation.status }}
        </div>
        <!-- Status info and actions -->
        <div class="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <div class="flex flex-wrap items-center gap-2 min-w-0">
            <span class="font-medium truncate">{{ ticket.vehicleStatus || 'Not Started' }}</span>
            <div
              :id="progressStatusBadgesId(ticket.id)"
              :class="[
                'flex flex-wrap items-center gap-2 min-w-0',
                isNarrowProgress && !isProgressRowExpanded(ticket.id) ? 'hidden' : '',
              ]"
            >
              <span
                v-if="viewMeta[ticket.id]?.isViewed"
                class="inline-flex items-center gap-1 rounded-full bg-brand-accent/15 px-2 py-[1px] text-[10px] font-medium text-brand-accent border border-brand-accent/30 dark:bg-brand-accent/25 dark:text-white dark:border-brand-accent/45"
              >
                Viewed
              </span>
              <span
                v-if="viewMeta[ticket.id]?.isApproved"
                class="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-[1px] text-[10px] font-medium text-green-800 border border-green-200 dark:bg-green-950/45 dark:text-green-300 dark:border-green-900"
              >
                Approved
              </span>
              <span
                v-if="ticket.vehicleStatus === 'Inspection Complete'"
                class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-[1px] text-[10px] text-muted-foreground border border-border"
              >
                Inspection ready to send
              </span>
            </div>
          </div>
          <div
            v-if="showProgressActions"
            class="flex items-center gap-2 flex-shrink-0"
            :data-onboarding="progressRowActionsOnboardingAttr(ticket, progressRowIdx)"
            @dblclick.stop
          >
            <Button
              v-if="ticketActionVisibility.nextStep && getNextAction(ticket)"
              variant="outline"
              type="button"
              class="h-[33px] w-[33px] min-w-[33px] shrink-0 flex items-center justify-center p-0"
              :title="`Next step: ${getNextAction(ticket)!.label}`"
              :aria-label="`Next step: ${getNextAction(ticket)!.label}`"
              @click="handlePrimaryAction(ticket)"
            >
              <!-- PhSteps unavailable in @phosphor-icons/vue 2.2 — forward / “do next” cue -->
              <PhCaretCircleRight :size="16" weight="regular" />
            </Button>
            <Button
              v-if="canViewCost && ticketActionVisibility.view"
              variant="outline"
              :class="['h-[33px] w-[33px] min-w-[33px] shrink-0 flex items-center justify-center p-0', getViewButtonClassName(ticket)]"
              :disabled="ticket.total === 0"
              title="View invoice"
              @click="handleViewClick(ticket)"
            >
              <PhEye :size="16" weight="regular" />
            </Button>
            <Button
              v-if="canChat && ticketActionVisibility.chat"
              variant="outline"
              type="button"
              :class="[
                'h-[33px] w-[33px] min-w-[33px] shrink-0 flex items-center justify-center p-0',
                tourDemoChatAccentClass(ticket),
              ]"
              title="Chat"
              @click="$emit('chat', ticket, $event)"
            >
              <PhChatCircle :size="16" weight="regular" />
            </Button>
            <Button
              v-if="ticketActionVisibility.inspection"
              :variant="getInspectionButtonProps(ticket.inspectionStatus).variant"
              type="button"
              title="Inspection"
              :class="cn('h-[33px] w-[33px] min-w-[33px] shrink-0 flex items-center justify-center p-0', getInspectionActionButtonClass(ticket))"
              @click="$emit('inspection', ticket)"
            >
              <PhClipboardText :size="16" weight="regular" />
            </Button>
            <Button
              v-if="ticketActionVisibility.timeline"
              variant="outline"
              type="button"
              class="h-[33px] w-[33px] min-w-[33px] shrink-0 flex items-center justify-center p-0"
              title="Timeline"
              @click="handleTimelineClick(ticket)"
            >
              <PhClockCounterClockwise :size="16" weight="regular" />
            </Button>
            <Button
              v-if="ticketActionVisibility.approvals"
              variant="outline"
              type="button"
              :class="['h-[33px] w-[33px] min-w-[33px] shrink-0 flex items-center justify-center p-0', getApprovalsButtonClass(ticket)]"
              title="Approvals"
              @click="handleApprovalsClick(ticket)"
            >
              <PhSealCheck :size="16" weight="regular" />
            </Button>
            <Button
              v-if="ticketActionVisibility.technicianWorksheet"
              variant="outline"
              type="button"
              class="h-[33px] w-[33px] min-w-[33px] shrink-0 flex items-center justify-center p-0"
              title="Technician Worksheet"
              aria-label="Technician Worksheet"
              @click="$emit('action', ticket, 'technicianWorksheet')"
            >
              <PhWrench :size="16" weight="regular" />
            </Button>
            <Button
              v-if="
                ticketActionVisibility.chat &&
                canChat &&
                ticket.vehicleStatus === 'Inspection Complete' &&
                canSendTicket(ticket)
              "
              variant="outline"
              type="button"
              class="h-[33px] w-[33px] min-w-[33px] shrink-0 flex items-center justify-center p-0"
              title="Send"
              aria-label="Send"
              @click="$emit('chat', ticket, $event)"
            >
              <PhPaperPlaneTilt :size="16" weight="regular" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="sortedTickets.length === 0" class="text-center py-8">
      <p class="text-muted-foreground">No tickets to display</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import Button from '@/components/ui/Button.vue'
import {
  PhEye,
  PhChatCircle,
  PhClipboardText,
  PhClockCounterClockwise,
  PhCaretCircleRight,
  PhSealCheck,
  PhCaretDown,
  PhCaretUp,
  PhPaperPlaneTilt,
  PhWrench,
} from '@phosphor-icons/vue'
import { cn } from '@/lib/utils'
import {
  DISPLAY_FIELDS,
  DEFAULT_PROGRESS_FIELDS,
  DEFAULT_TICKET_ACTION_VISIBILITY,
  FINANCIAL_FIELD_KEYS,
  type Ticket,
  type VehicleStatus,
  type TicketActionVisibility,
} from '@/types/ticket'
import type { ProgressSortOption } from '@/types/ticket'
import { useApprovalsActionButtonState } from '@/composables/useApprovalsActionButtonState'
import { useInspectionViewButtonState } from '@/composables/useInspectionViewButtonState'
import { useViewButtonState, VIEW_BUTTON_SOLID_VIEWED_CLASS } from '@/composables/useViewButtonState'
import { getNextAction } from '@/utils/ticketNextAction'
import {
  TOUR_DEMO_APPROVALS_SOLID_GREEN_CLASS,
  TOUR_DEMO_ROW_ACTION_ACCENT_CLASS,
} from '@/lib/tickets-tour-demo'

interface ViewMeta {
  isViewed?: boolean
  isApproved?: boolean
}

interface Props {
  tickets: Ticket[]
  sortBy?: ProgressSortOption
  viewMeta?: Record<number, ViewMeta>
  /** Progress view fields to show in the left column (name/vehicle always first). */
  visibleFields?: string[]
  viewStatusUpdateTrigger?: number
  inspectionViewUpdateTrigger?: number
  approvalUpdateTrigger?: number
  canViewCost?: boolean
  canChat?: boolean
  ticketActionVisibility?: TicketActionVisibility
}

const props = withDefaults(defineProps<Props>(), {
  sortBy: 'readyFirst',
  viewMeta: () => ({}),
  visibleFields: () => [...DEFAULT_PROGRESS_FIELDS],
  canViewCost: true,
  canChat: true,
  ticketActionVisibility: () => ({ ...DEFAULT_TICKET_ACTION_VISIBILITY }),
})

const ticketActionVisibility = computed(() => props.ticketActionVisibility ?? DEFAULT_TICKET_ACTION_VISIBILITY)

const hasAdvActionSignalsAnchor = computed(() =>
  props.tickets.some((t) => t.tourDemoAdvActionSignalsAnchor),
)

function progressRowActionsOnboardingAttr(
  ticket: Ticket,
  rowIdx: number,
): 'ticket-row-actions' | undefined {
  if (ticket.tourDemoAdvActionSignalsAnchor) return 'ticket-row-actions'
  if (!hasAdvActionSignalsAnchor.value && rowIdx === 0) return 'ticket-row-actions'
  return undefined
}

const resolvedVisibleFields = computed<string[]>(() => {
  const fields = props.visibleFields ?? []
  return fields.length ? fields : [...DEFAULT_PROGRESS_FIELDS]
})

const showProgressActions = computed(() => resolvedVisibleFields.value.includes('actions'))

const leftColumnExtraFields = computed(() => {
  const baseKeys = new Set(['name', 'vehicle'])
  return resolvedVisibleFields.value
    .filter((key) => !baseKeys.has(key) && key !== 'actions')
    .map((key) => ({
      key,
      label: DISPLAY_FIELDS.find((f) => f.key === key)?.label ?? key,
    }))
})

const isNarrowProgress = ref(false)
const progressRowExpanded = ref<Record<number, boolean>>({})
let narrowProgressMq: MediaQueryList | null = null

function handleNarrowProgressMqChange() {
  if (narrowProgressMq) isNarrowProgress.value = narrowProgressMq.matches
}

function isProgressRowExpanded(ticketId: number): boolean {
  return progressRowExpanded.value[ticketId] === true
}

function toggleProgressRowExpanded(ticketId: number) {
  progressRowExpanded.value[ticketId] = !isProgressRowExpanded(ticketId)
}

function progressExtraFieldsId(ticketId: number): string {
  return `progress-extra-${ticketId}`
}

function progressStatusBadgesId(ticketId: number): string {
  return `progress-badges-${ticketId}`
}

function progressRowAriaControls(ticketId: number): string {
  const ids: string[] = [progressStatusBadgesId(ticketId)]
  if (leftColumnExtraFields.value.length > 0) {
    ids.unshift(progressExtraFieldsId(ticketId))
  }
  return ids.join(' ')
}

function showProgressCollapseToggle(ticket: Ticket): boolean {
  if (leftColumnExtraFields.value.length > 0) return true
  if (props.viewMeta?.[ticket.id]?.isViewed) return true
  if (props.viewMeta?.[ticket.id]?.isApproved) return true
  if (ticket.vehicleStatus === 'Inspection Complete') return true
  return false
}

const emit = defineEmits<{
  'update:sortBy': [value: ProgressSortOption]
  view: [ticket: Ticket]
  'open-view-panel': [ticket: Ticket]
  chat: [ticket: Ticket, anchor?: MouseEvent]
  inspection: [ticket: Ticket]
  timeline: [ticket: Ticket]
  approvals: [ticket: Ticket]
  action: [ticket: Ticket, action: string]
  statusChange: [ticketId: number, status: VehicleStatus]
}>()

const { getApprovalsActionButtonClass, markApprovalsActionFlashDismissed } =
  useApprovalsActionButtonState(() => props.approvalUpdateTrigger)
const { getViewButtonClass, dismissViewButtonFlash } = useViewButtonState(() => props.viewStatusUpdateTrigger)
const { getInspectionViewButtonClass } = useInspectionViewButtonState(() => props.inspectionViewUpdateTrigger)

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
  dismissViewButtonFlash(ticket.ticketNumber)
  emit('open-view-panel', ticket)
}

function getInspectionButtonProps(status?: string) {
  switch (status) {
    case 'complete':
      return { variant: 'default' as const, className: VIEW_BUTTON_SOLID_VIEWED_CLASS }
    case 'incomplete':
      return { variant: 'default' as const, className: 'bg-yellow-500 hover:bg-yellow-600 text-white border-transparent' }
    default:
      return { variant: 'outline' as const, className: '' }
  }
}

function getInspectionActionButtonClass(ticket: Ticket): string {
  const base = getInspectionButtonProps(ticket.inspectionStatus).className
  if (ticket.inspectionStatus !== 'complete') return base
  return cn(base, getInspectionViewButtonClass(ticket.ticketNumber))
}

const confirmation = ref<{ ticketId: number; status: string } | null>(null)
let confirmationTimeout: ReturnType<typeof setTimeout> | null = null
const confirmationRef = ref<HTMLElement | null>(null)

function handleStatusChange(ticketId: number, status: VehicleStatus) {
  if (confirmationTimeout) clearTimeout(confirmationTimeout)
  emit('statusChange', ticketId, status)
  confirmation.value = { ticketId, status }
  confirmationTimeout = setTimeout(() => {
    confirmation.value = null
    confirmationTimeout = null
  }, 3000)
}

function dismissConfirmation() {
  confirmation.value = null
  if (confirmationTimeout) {
    clearTimeout(confirmationTimeout)
    confirmationTimeout = null
  }
}

function handleConfirmationClickOutside(e: MouseEvent) {
  if (confirmation.value === null) return
  const el = confirmationRef.value
  if (el && !el.contains(e.target as Node)) dismissConfirmation()
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    narrowProgressMq = window.matchMedia('(max-width: 767px)')
    isNarrowProgress.value = narrowProgressMq.matches
    narrowProgressMq.addEventListener('change', handleNarrowProgressMqChange)
  }
  document.addEventListener('mousedown', handleConfirmationClickOutside)
})

onUnmounted(() => {
  narrowProgressMq?.removeEventListener('change', handleNarrowProgressMqChange)
  document.removeEventListener('mousedown', handleConfirmationClickOutside)
})

/** True when ticket has customer invoice view (viewable invoice) or inspection to send. */
function canSendTicket(ticket: Ticket): boolean {
  const hasInvoiceView = ticket.total != null && ticket.total > 0
  const hasInspection = !!(ticket.inspectionId || ticket.inspectionStatus === 'complete')
  return hasInvoiceView || hasInspection
}

/** Progress bar order: mirrors API status sequence (Not Started first for pre-flow tickets). */
const STATUS_SEQUENCE: VehicleStatus[] = [
  'Not Started',
  'Online Appointment',
  'Not Here Yet',
  'Check In',
  'On Lot',
  'In Shop',
  'Inspection Complete',
  'Awaiting Callback',
  'Awaiting Parts',
  'Out For Sublet',
  'Ready',
]

type SortDirection = 'asc' | 'desc'

function toDateValue(value?: string): number | null {
  if (!value || !value.trim()) return null
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

function compareOptionalNumber(a: number | null | undefined, b: number | null | undefined, direction: SortDirection): number {
  const aMissing = a == null || Number.isNaN(a)
  const bMissing = b == null || Number.isNaN(b)
  if (aMissing && bMissing) return 0
  if (aMissing) return 1
  if (bMissing) return -1
  return direction === 'asc' ? (a - b) : (b - a)
}

function compareOptionalString(a: string | null | undefined, b: string | null | undefined, direction: SortDirection): number {
  const aNorm = (a ?? '').trim()
  const bNorm = (b ?? '').trim()
  const aMissing = aNorm.length === 0
  const bMissing = bNorm.length === 0
  if (aMissing && bMissing) return 0
  if (aMissing) return 1
  if (bMissing) return -1
  const comparison = aNorm.localeCompare(bNorm, undefined, { sensitivity: 'base' })
  return direction === 'asc' ? comparison : -comparison
}

const sortedTickets = computed(() => {
  const statusOrder = (status: VehicleStatus | undefined): number => {
    const idx = STATUS_SEQUENCE.indexOf(status || 'Not Started')
    return idx === -1 ? 0 : idx
  }

  const list = [...props.tickets]
  const sortBy = props.sortBy ?? 'readyFirst'

  switch (sortBy) {
    case 'readyFirst':
      return list.sort((a, b) => statusOrder(b.vehicleStatus) - statusOrder(a.vehicleStatus))
    case 'readyLast':
      return list.sort((a, b) => statusOrder(a.vehicleStatus) - statusOrder(b.vehicleStatus))
    case 'ticketNumberAsc':
      return list.sort((a, b) => (a.ticketNumber ?? 0) - (b.ticketNumber ?? 0))
    case 'ticketNumberDesc':
      return list.sort((a, b) => (b.ticketNumber ?? 0) - (a.ticketNumber ?? 0))
    case 'timeUntilDueAsc':
      return list.sort((a, b) => compareOptionalNumber(a.timeUntilPromiseMinutes, b.timeUntilPromiseMinutes, 'asc'))
    case 'overdueTimeDesc':
      return list.sort((a, b) => compareOptionalNumber(a.promiseOverdueByMinutes, b.promiseOverdueByMinutes, 'desc'))
    case 'readyForDesc':
      return list.sort((a, b) => compareOptionalNumber(a.readyForMinutes, b.readyForMinutes, 'desc'))
    case 'timeSinceCheckInDesc':
      return list.sort((a, b) => compareOptionalNumber(a.timeSinceCheckInMinutes, b.timeSinceCheckInMinutes, 'desc'))
    case 'serviceCycleTimeDesc':
      return list.sort((a, b) => compareOptionalNumber(a.serviceCycleTimeMinutes, b.serviceCycleTimeMinutes, 'desc'))
    case 'ticketAgeDesc':
      return list.sort((a, b) => compareOptionalNumber(a.ticketAgeMinutes, b.ticketAgeMinutes, 'desc'))
    case 'promisedTimeAsc':
      return list.sort((a, b) => compareOptionalNumber(toDateValue(a.promisedTime), toDateValue(b.promisedTime), 'asc'))
    case 'promisedTimeDesc':
      return list.sort((a, b) => compareOptionalNumber(toDateValue(a.promisedTime), toDateValue(b.promisedTime), 'desc'))
    case 'gpPercentDesc':
      return list.sort((a, b) => compareOptionalNumber(a.gpPercent, b.gpPercent, 'desc'))
    case 'gpPercentAsc':
      return list.sort((a, b) => compareOptionalNumber(a.gpPercent, b.gpPercent, 'asc'))
    case 'totalDesc':
      return list.sort((a, b) => compareOptionalNumber(a.total, b.total, 'desc'))
    case 'totalAsc':
      return list.sort((a, b) => compareOptionalNumber(a.total, b.total, 'asc'))
    case 'technicianAsc':
      return list.sort((a, b) => compareOptionalString(a.technician, b.technician, 'asc'))
    case 'technicianDesc':
      return list.sort((a, b) => compareOptionalString(a.technician, b.technician, 'desc'))
    case 'salesrepAsc':
      return list.sort((a, b) => compareOptionalString(a.salesrep, b.salesrep, 'asc'))
    case 'salesrepDesc':
      return list.sort((a, b) => compareOptionalString(a.salesrep, b.salesrep, 'desc'))
    case 'bayAsc':
      return list.sort((a, b) => compareOptionalString(a.bay, b.bay, 'asc'))
    case 'bayDesc':
      return list.sort((a, b) => compareOptionalString(a.bay, b.bay, 'desc'))
    case 'viewedStatusViewedFirst':
      return list.sort((a, b) => {
        const aViewed = props.viewMeta?.[a.id]?.isViewed === true
        const bViewed = props.viewMeta?.[b.id]?.isViewed === true
        if (aViewed === bViewed) return (b.ticketNumber ?? 0) - (a.ticketNumber ?? 0)
        return aViewed ? -1 : 1
      })
    case 'approvedStatusApprovedFirst':
      return list.sort((a, b) => {
        const aApproved = props.viewMeta?.[a.id]?.isApproved === true
        const bApproved = props.viewMeta?.[b.id]?.isApproved === true
        if (aApproved === bApproved) return (b.ticketNumber ?? 0) - (a.ticketNumber ?? 0)
        return aApproved ? -1 : 1
      })
    default:
      return list.sort((a, b) => statusOrder(b.vehicleStatus) - statusOrder(a.vehicleStatus))
  }
})

function getStepLabel(status: VehicleStatus | ''): string {
  if (!status) return 'Start'
  if (status === 'Not Started') return 'Start'
  if (status === 'Online Appointment') return 'Appt'
  if (status === 'Inspection Complete') return 'Inspected'
  if (status === 'Awaiting Callback') return 'Callback'
  if (status === 'Awaiting Parts') return 'Parts'
  if (status === 'Out For Sublet') return 'Sublet'
  return status
}

function getSegmentClass(ticketStatus: VehicleStatus | undefined, stepStatus: VehicleStatus): string {
  const currentIdx = STATUS_SEQUENCE.indexOf(ticketStatus || 'Not Started')
  const stepIdx = STATUS_SEQUENCE.indexOf(stepStatus)
  
  if (stepIdx < currentIdx) {
    return 'bg-brand-accent'
  } else if (stepIdx === currentIdx) {
    return 'bg-blue-500'
  }
  return 'bg-slate-200 dark:bg-slate-600'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

function getTimeFieldClass(key: string, ticket: Ticket): string {
  switch (key) {
    case 'ticketAgeLabel':
      return ticket.ticketAgeMinutes != null && ticket.ticketAgeMinutes >= 480
        ? 'text-red-700 font-semibold'
        : ''
    case 'timeUntilDueLabel':
      return ticket.timeUntilPromiseMinutes != null && ticket.timeUntilPromiseMinutes < 0
        ? 'text-red-700 font-semibold'
        : ''
    case 'overdueTimeLabel':
      return ticket.promiseOverdueByMinutes != null && ticket.promiseOverdueByMinutes > 0
        ? 'text-red-700 font-semibold'
        : ''
    case 'readyForLabel':
      return ticket.readyForMinutes != null && ticket.readyForMinutes >= 480
        ? 'text-amber-700 font-semibold'
        : ''
    case 'timeSinceCheckInLabel':
      return ticket.timeSinceCheckInMinutes != null && ticket.timeSinceCheckInMinutes >= 60
        ? 'text-amber-700 font-semibold'
        : ''
    case 'serviceCycleTimeLabel':
      return ticket.serviceCycleTimeMinutes != null && ticket.serviceCycleTimeMinutes >= 480
        ? 'text-red-700 font-semibold'
        : ''
    case 'inspectionCompletionLabel':
      return ticket.inspectionCompletionMinutes != null && ticket.inspectionCompletionMinutes >= 60
        ? 'text-amber-700 font-semibold'
        : ''
    default:
      return ''
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

function getDisplayValue(ticket: Ticket, key: string): string {
  if (!props.canViewCost && financialFieldKeySet.has(key)) {
    return '—'
  }
  switch (key) {
    case 'viewedStatus':
      return props.viewMeta?.[ticket.id]?.isViewed ? 'Viewed' : 'Not Viewed'
    case 'approvedStatus':
      return props.viewMeta?.[ticket.id]?.isApproved ? 'Approved' : 'Not Approved'
    case 'ticketNumber':
      return ticket.ticketNumber ? `#${ticket.ticketNumber}` : '—'
    case 'type':
      // Match TableStyle getTypeLabel mapping
      switch (ticket.type) {
        case 'Q': return 'Quote'
        case 'W': return 'WO'
        case 'I': return 'Inv'
        case 'B': return 'Batch'
        default: return ticket.type || '—'
      }
    case 'total':
    case 'subtotal':
    case 'salesTax':
    case 'cost': {
      const value = (ticket as any)[key]
      if (value == null || value === 0) return '—'
      return formatCurrency(Number(value))
    }
    case 'gpPercent': {
      const value = (ticket as any)[key]
      if (value == null) return '—'
      return `${Number(value).toFixed(1)}%`
    }
    case 'vehicleStatus':
      return ticket.vehicleStatus || 'Not Started'
    case 'name':
      return ticket.name || 'Unknown customer'
    case 'vehicle':
      return ticket.vehicle || 'No vehicle info'
    case 'inspectionStatus': {
      const raw = ticket.inspectionStatus
      const normalized = (raw ?? '').trim().toLowerCase()
      return normalized === '' || normalized === 'none' ? '' : String(raw)
    }
    case 'overdueTimeLabel':
      return ticket.overdueTimeLabel ?? ticket.promiseOverdueByLabel ?? (ticket.promiseOverdueByMinutes != null ? String(ticket.promiseOverdueByMinutes) : '—')
  case 'apptDurationMinutes': {
      const value = (ticket as any)[key]
      return typeof value === 'number' ? formatDurationMinutes(value) : '—'
    }
    default: {
      const value = (ticket as any)[key]
      if (value == null || value === '') return '—'
      return String(value)
    }
  }
}

function handlePrimaryAction(ticket: Ticket) {
  const action = getNextAction(ticket)
  if (action) {
    emit('action', ticket, action.action)
  }
}
</script>
