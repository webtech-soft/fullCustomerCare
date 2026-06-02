<template>
  <Card class="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md" @dblclick="handleCardDblClick">
    <CardHeader class="pb-3">
      <!-- Narrow screens: collapsed summary (customer as title; ticket # only when expanded) -->
      <div v-if="isMobile && !mobileCardExpanded" class="flex gap-2 items-start">
        <div class="flex-1 min-w-0 space-y-1.5">
          <h3
            v-if="hasNameField"
            class="text-lg font-semibold text-foreground truncate"
          >
            {{ ticket.name?.trim() ? ticket.name : "—" }}
          </h3>
          <p v-if="hasVehicleField" class="text-sm text-muted-foreground">
            {{ ticket.vehicle?.trim() ? ticket.vehicle : "—" }}
          </p>
          <div
            v-if="hasVehicleStatusSection"
            ref="collapsedSummaryStatusRef"
            class="pt-0.5"
            @dblclick.stop
          >
            <button
              type="button"
              class="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              :aria-expanded="showStatusPopover"
              aria-haspopup="true"
              :aria-label="`Vehicle status: ${displayStatus || 'Not Started'}. Change status`"
              @click="toggleStatusPopover"
            >
              <Badge
                ref="badgeRef"
                :class="[
                  'text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity',
                  getVehicleStatusColor(displayStatus || 'Not Started'),
                ]"
              >
                {{ displayStatus }}
              </Badge>
            </button>
          </div>
        </div>
        <div class="flex flex-col items-end gap-1 shrink-0">
          <p
            v-if="canViewCost && hasTotalField"
            class="text-base font-semibold text-foreground tabular-nums leading-tight text-right max-w-[7.5rem] truncate"
            title="Ticket total"
          >
            {{ formatCurrency(ticket.total) }}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-9 w-9 p-0"
            :aria-expanded="false"
            :aria-controls="ticketCardDetailsId"
            aria-label="Show ticket details"
            @click.stop="mobileCardExpanded = true"
          >
            <PhCaretDown :size="18" weight="bold" />
          </Button>
        </div>
      </div>

      <!-- Desktop or mobile expanded: full header -->
      <template v-else>
        <div class="flex flex-row items-start justify-between gap-3">
          <div class="flex-1 space-y-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h3
                v-if="hasTicketNumberField"
                class="text-lg font-semibold text-foreground"
              >
                Ticket #{{ ticket.ticketNumber }}
              </h3>
              <Badge
                v-if="hasTicketTypeField"
                variant="outline"
                class="text-xs"
              >
                {{ getTypeLabel(ticket.type) }}
              </Badge>
              <Badge
                v-if="hasBayField && bayValue"
                variant="outline"
                class="text-xs"
              >
                Bay {{ bayValue }}
              </Badge>
            </div>
            <p
              v-if="hasDateField"
              class="text-sm text-muted-foreground"
            >
              {{ ticket.date }}
            </p>
          </div>
          <div
            v-if="(canViewCost && hasTotalField) || (isMobile && mobileCardExpanded)"
            class="flex flex-col items-end gap-1 shrink-0"
          >
            <div
              v-if="canViewCost && hasTotalField"
              class="text-right"
            >
              <p class="text-base font-semibold text-foreground tabular-nums leading-tight sm:text-lg">
                {{ formatCurrency(ticket.total) }}
              </p>
            </div>
            <Button
              v-if="isMobile && mobileCardExpanded"
              type="button"
              variant="ghost"
              size="sm"
              class="h-9 w-9 p-0"
              :aria-expanded="true"
              :aria-controls="ticketCardDetailsId"
              aria-label="Hide ticket details"
              @click.stop="mobileCardExpanded = false"
            >
              <PhCaretUp :size="18" weight="bold" />
            </Button>
          </div>
        </div>
        <div v-if="hasStatusFlagsSection" class="mt-2 flex flex-wrap gap-1">
          <Badge
            v-if="showApprovedBadge && statusFlags.isApproved"
            class="text-[10px] px-1.5 py-0.5 font-semibold bg-brand-accent/15 text-brand-accent border border-brand-accent/30 dark:bg-brand-accent/25 dark:text-white dark:border-brand-accent/45 uppercase tracking-wide"
          >
            Approved
          </Badge>
          <Badge
            v-if="showViewedBadge && statusFlags.isViewed"
            class="text-[10px] px-1.5 py-0.5 font-semibold bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-950/45 dark:text-sky-300 dark:border-sky-900 uppercase tracking-wide"
          >
            Viewed
          </Badge>
          <Badge
            v-if="statusFlags.isOverdue"
            class="text-[10px] px-1.5 py-0.5 font-semibold bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/45 dark:text-red-300 dark:border-red-900 uppercase tracking-wide"
          >
            Overdue
          </Badge>
          <Badge
            v-if="statusFlags.inspectionStarted && !statusFlags.inspectionComplete"
            class="text-[10px] px-1.5 py-0.5 font-semibold bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/45 dark:text-amber-300 dark:border-amber-900 uppercase tracking-wide"
          >
            Insp. Started
          </Badge>
          <Badge
            v-if="statusFlags.inspectionComplete"
            class="text-[10px] px-1.5 py-0.5 font-semibold bg-brand-accent/15 text-brand-accent border border-brand-accent/30 dark:bg-brand-accent/25 dark:text-white dark:border-brand-accent/45 uppercase tracking-wide"
          >
            Insp. Complete
          </Badge>
        </div>
      </template>
    </CardHeader>
    <CardContent
      :id="ticketCardDetailsId"
      class="flex flex-1 flex-col space-y-4"
    >
      <template v-if="detailVisible">
      <!-- Dynamic field sections (Customer, Vehicle, Scheduling, Routing) -->
      <div v-if="dynamicSections.length > 0" class="rounded-lg bg-muted px-3 py-3">
        <div
          v-for="(section, sectionIndex) in dynamicSections"
          :key="section.id"
          :class="sectionIndex > 0 ? 'mt-3 pt-3 border-t border-border' : ''"
        >
          <div
            :class="[
              'grid grid-cols-1 gap-x-4 gap-y-1 text-sm',
              section.fields.length > 1 ? 'sm:grid-cols-2' : 'sm:grid-cols-1',
            ]"
          >
            <div
              v-for="field in section.fields"
              :key="`${section.id}-${field.key}`"
              :class="[
                'min-w-0',
                field.key === 'address' && section.fields.length > 1 ? 'sm:col-span-2' : '',
              ]"
            >
              <div class="text-xs font-medium text-muted-foreground mb-0.5">
                {{ field.label }}
              </div>
              <div
                :class="[
                  getTimeFieldClass(field.key) || 'text-foreground',
                  'break-words',
                ]"
              >
                {{ getFieldDisplayValue(field.key) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Ticket Info (Totals) -->
      <div
        v-if="canViewCost && hasAnyTicketInfoFields"
        class="rounded-lg bg-muted px-3 py-3"
      >
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div v-if="hasSubtotalField && ticket.subtotal !== undefined && ticket.subtotal !== null">
            <div class="text-xs font-medium text-muted-foreground mb-0.5">
              Subtotal
            </div>
            <div class="text-foreground">
              {{ getFieldDisplayValue('subtotal') }}
            </div>
          </div>
          <div v-if="hasSalesTaxField && ticket.salesTax !== undefined && ticket.salesTax !== null">
            <div class="text-xs font-medium text-muted-foreground mb-0.5">
              Sales Tax
            </div>
            <div class="text-foreground">
              {{ getFieldDisplayValue('salesTax') }}
            </div>
          </div>
          <div v-if="hasCostField && ticket.cost !== undefined && ticket.cost !== null">
            <div class="text-xs font-medium text-muted-foreground mb-0.5">
              Cost
            </div>
            <div class="text-foreground">
              {{ getFieldDisplayValue('cost') }}
            </div>
          </div>
          <div v-if="hasGpPercentField && ticket.gpPercent !== undefined && ticket.gpPercent !== null">
            <div class="text-xs font-medium text-muted-foreground mb-0.5">
              GP %
            </div>
            <div class="text-foreground">
              {{ getFieldDisplayValue('gpPercent') }}
            </div>
          </div>
        </div>
      </div>

      <!-- Staff / Status Info -->
      <div v-if="showStaffOrStatusSection" class="space-y-2 text-sm">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-if="hasSalesrepField">
            <div class="text-xs font-medium text-muted-foreground mb-1">
              Salesrep
            </div>
            <div class="text-foreground">{{ ticket.salesrep || "—" }}</div>
          </div>
          <div v-if="hasTechnicianField">
            <div class="text-xs font-medium text-muted-foreground mb-1">
              Technician
            </div>
            <div class="text-foreground">{{ ticket.technician || "—" }}</div>
          </div>
        </div>
        <div
          v-if="hasVehicleStatusSection"
          ref="statusRef"
          class="pt-1"
          @dblclick.stop
        >
          <div class="text-xs font-medium text-muted-foreground mb-1">
            Vehicle Status
          </div>
          <button
            type="button"
            class="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            :aria-expanded="showStatusPopover"
            aria-haspopup="true"
            :aria-label="`Vehicle status: ${displayStatus || 'Not Started'}. Change status`"
            @click="toggleStatusPopover"
          >
            <Badge
              ref="badgeRef"
              :class="[
                'text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity',
                getVehicleStatusColor(displayStatus || 'Not Started'),
              ]"
            >
              {{ displayStatus }}
            </Badge>
          </button>
        </div>
      </div>
      </template>

      <!-- Status Popover - Rendered outside card to avoid clipping -->
      <Teleport to="body">
        <div
          v-if="showStatusPopover"
          ref="popoverRef"
          class="fixed z-[100] w-[calc(100vw-2rem)] sm:w-56 max-w-sm rounded-md border border-border bg-popover p-1 overflow-hidden shadow-lg text-popover-foreground"
          :style="{
            top: `${popoverPosition.top}px`,
            left: `${popoverPosition.left}px`,
          }"
        >
          <div 
            class="space-y-1 overflow-y-auto"
            :style="{ maxHeight: `${popoverPosition.maxHeight}px` }"
          >
            <button
              v-for="status in VEHICLE_STATUSES"
              :key="status"
              @click="handleVehicleStatusChange(status)"
              :class="cn(
                'w-full text-left px-3 py-3 sm:py-2 text-sm rounded-md transition-colors min-h-[44px] sm:min-h-0',
                status === displayStatus
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'hover:bg-accent hover:text-accent-foreground active:bg-accent'
              )"
            >
              {{ status }}
            </button>
          </div>
        </div>
      </Teleport>

      <!-- Action Buttons -->
      <div
        v-if="!visibleFieldKeys?.length || visibleFieldKeys.includes('actions')"
        class="mt-auto flex flex-col gap-2 pt-2"
        data-ticket-card-actions
        :data-onboarding="markOnboardingActions ? 'ticket-row-actions' : undefined"
        @dblclick.stop
      >
        <div
          class="flex flex-wrap gap-2 sm:grid sm:grid-cols-3 sm:gap-2"
        >
          <Button
            v-if="ticketActionVisibility.nextStep && nextAction"
            variant="outline"
            size="sm"
            type="button"
            class="max-sm:h-9 max-sm:w-9 max-sm:p-0 max-sm:shrink-0 flex items-center justify-center min-h-[44px] h-11 sm:min-h-[44px] w-full"
            :title="`Next step: ${nextAction.label}`"
            :aria-label="`Next step: ${nextAction.label}`"
            @click="handleNextStepClick"
          >
            <!-- PhSteps unavailable in @phosphor-icons/vue 2.2 — forward / “do next” cue -->
            <PhCaretCircleRight :size="14" weight="regular" class="sm:mr-2" />
            <span class="hidden sm:inline text-sm">Next</span>
          </Button>
          <Button
            v-if="canViewCost && ticketActionVisibility.view"
            variant="outline"
            size="sm"
            @click="handleViewClick"
            :disabled="loadingTicketNumber === ticket.ticketNumber || (ticket.total === 0)"
            :class="cn(
              'max-sm:h-9 max-sm:w-9 max-sm:p-0 max-sm:shrink-0 flex items-center justify-center min-h-[44px] h-11 sm:min-h-[44px] w-full',
              viewButtonClass
            )"
          >
            <PhEye
              v-if="loadingTicketNumber !== ticket.ticketNumber"
              :size="14"
              weight="regular"
              class="sm:mr-2"
            />
            <span
              v-else
              class="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin inline-block"
            />
            <span class="hidden sm:inline text-sm">View</span>
          </Button>
          <Button
            v-if="canChat && ticketActionVisibility.chat"
            variant="outline"
            size="sm"
            @click="(e) => $emit('chat', ticket, e)"
            :class="cn(
              'max-sm:h-9 max-sm:w-9 max-sm:p-0 max-sm:shrink-0 flex items-center justify-center min-h-[44px] h-11 sm:min-h-[44px] w-full',
              tourDemoChatAccentClass,
            )"
            title="Chat"
            aria-label="Chat"
          >
            <PhChatCircle :size="14" weight="regular" class="sm:mr-2" />
            <span class="hidden sm:inline text-sm">Chat</span>
          </Button>
          <Button
            v-if="showTimelineButton && ticketActionVisibility.timeline"
            variant="outline"
            size="sm"
            type="button"
            class="max-sm:h-9 max-sm:w-9 max-sm:p-0 max-sm:shrink-0 flex items-center justify-center min-h-[44px] h-11 sm:min-h-[44px] w-full"
            title="Timeline"
            aria-label="Timeline"
            @click="handleTimelineClick"
          >
            <PhClockCounterClockwise :size="14" weight="regular" class="sm:mr-2" />
            <span class="hidden sm:inline text-sm">Timeline</span>
          </Button>
          <Button
            v-if="ticketActionVisibility.approvals"
            variant="outline"
            size="sm"
            type="button"
            :class="cn(
              'max-sm:h-9 max-sm:w-9 max-sm:p-0 max-sm:shrink-0 flex items-center justify-center min-h-[44px] h-11 sm:min-h-[44px] w-full',
              approvalsButtonClass
            )"
            title="Approvals"
            aria-label="Approvals"
            @click="handleApprovalsClick"
          >
            <PhSealCheck :size="14" weight="regular" class="sm:mr-2" />
            <span class="hidden sm:inline text-sm">Approvals</span>
          </Button>
          <Button
            v-if="ticketActionVisibility.technicianWorksheet"
            variant="outline"
            size="sm"
            type="button"
            class="max-sm:h-9 max-sm:w-9 max-sm:p-0 max-sm:shrink-0 flex items-center justify-center min-h-[44px] h-11 sm:min-h-[44px] w-full"
            title="Technician Worksheet"
            aria-label="Technician Worksheet"
            @click="() => $emit('action', ticket, 'technicianWorksheet')"
          >
            <PhWrench :size="14" weight="regular" class="sm:hidden" />
            <PhWrench :size="14" weight="regular" class="hidden sm:inline sm:mr-2" />
            <span class="hidden sm:inline text-sm">Tech WS</span>
          </Button>
          <Button
            v-if="ticketActionVisibility.inspection"
            size="sm"
            :variant="getInspectionButtonProps(ticket.inspectionStatus).variant"
            @click="() => $emit('inspection', ticket)"
            title="Inspection"
            aria-label="Inspection"
            :class="cn(
              'max-sm:h-9 max-sm:w-9 max-sm:p-0 max-sm:shrink-0 flex items-center justify-center min-h-[44px] h-11 sm:min-h-[44px] w-full',
              getInspectionActionButtonClass(ticket)
            )"
          >
            <PhClipboardText :size="14" weight="regular" class="sm:mr-2" />
            <span class="hidden sm:inline text-sm">Inspection</span>
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, type ComponentPublicInstance } from 'vue'
import Card from './ui/Card.vue'
import CardContent from './ui/CardContent.vue'
import CardHeader from './ui/CardHeader.vue'
import Button from './ui/Button.vue'
import Badge from './ui/Badge.vue'
import { PhEye, PhChatCircle, PhClipboardText, PhClockCounterClockwise, PhCaretCircleRight, PhSealCheck, PhCaretDown, PhCaretUp, PhWrench } from '@phosphor-icons/vue'
import type { Ticket, TicketStatusMeta, DisplayFieldConfig, DisplayFieldCategory, TicketActionVisibility } from '@/types/ticket'
import { DEFAULT_TICKET_ACTION_VISIBILITY } from '@/types/ticket'
import { DISPLAY_FIELD_CATEGORIES } from '@/types/ticket'
import { cn } from '@/lib/utils'
import { vehicleStatusBadgeClass } from '@/lib/vehicle-status-badge-classes'
import { getTicketStatusFlags, type DerivedStatusFlags } from '@/utils/ticketStatus'
import { getNextAction } from '@/utils/ticketNextAction'
import { useApprovalsActionButtonState } from '@/composables/useApprovalsActionButtonState'
import { useInspectionViewButtonState } from '@/composables/useInspectionViewButtonState'
import { useViewButtonState, VIEW_BUTTON_SOLID_VIEWED_CLASS } from '@/composables/useViewButtonState'
import {
  TOUR_DEMO_APPROVALS_SOLID_GREEN_CLASS,
  TOUR_DEMO_ROW_ACTION_ACCENT_CLASS,
} from '@/lib/tickets-tour-demo'

interface Props {
  ticket: Ticket
  visibleFieldKeys?: string[]
  fieldsByCategory?: Partial<Record<DisplayFieldCategory, DisplayFieldConfig[]>>
  loadingTicketNumber?: number | null
  viewStatusUpdateTrigger?: number
  inspectionViewUpdateTrigger?: number
  approvalUpdateTrigger?: number
  /** When false, hide Total and View (permission_cost). Default true. */
  canViewCost?: boolean
  /** When false, hide Chat (permission_Chat + HDN1 ∈ {1,4,6}). Default true. */
  canChat?: boolean
  statusMeta?: TicketStatusMeta
  /** When false, hide Timeline action (e.g. Check-ins page). Default true. */
  showTimelineButton?: boolean
  ticketActionVisibility?: TicketActionVisibility
  /** First card in list: spotlight anchor for tickets onboarding */
  markOnboardingActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visibleFieldKeys: undefined,
  fieldsByCategory: undefined,
  canViewCost: true,
  canChat: true,
  statusMeta: undefined,
  showTimelineButton: true,
  ticketActionVisibility: () => ({ ...DEFAULT_TICKET_ACTION_VISIBILITY }),
  markOnboardingActions: false,
})

const ticketActionVisibility = computed(
  () => props.ticketActionVisibility ?? DEFAULT_TICKET_ACTION_VISIBILITY
)

const ticketCardDetailsId = computed(() => `ticket-card-details-${props.ticket.id}`)

// Available vehicle statuses
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

const getVehicleStatusColor = (status: string) => vehicleStatusBadgeClass(status)

const getInspectionButtonProps = (status?: string) => {
  switch (status) {
    case "complete":
      return {
        variant: "default" as const,
        className: VIEW_BUTTON_SOLID_VIEWED_CLASS,
      }
    case "incomplete":
      return {
        variant: "default" as const,
        className: "bg-yellow-500 hover:bg-yellow-600 text-white",
      }
    default:
      return {
        variant: "outline" as const,
        className: "",
      }
  }
}

const getTimeFieldClass = (key: string): string => {
  switch (key) {
    case 'ticketAgeLabel':
      return props.ticket.ticketAgeMinutes != null && props.ticket.ticketAgeMinutes >= 480
        ? 'text-red-700 font-semibold'
        : ''
    case 'timeUntilDueLabel':
      return props.ticket.timeUntilPromiseMinutes != null && props.ticket.timeUntilPromiseMinutes < 0
        ? 'text-red-700 font-semibold'
        : ''
    case 'overdueTimeLabel':
      return props.ticket.promiseOverdueByMinutes != null && props.ticket.promiseOverdueByMinutes > 0
        ? 'text-red-700 font-semibold'
        : ''
    case 'readyForLabel':
      return props.ticket.readyForMinutes != null && props.ticket.readyForMinutes >= 480
        ? 'text-amber-700 font-semibold'
        : ''
    case 'timeSinceCheckInLabel':
      return props.ticket.timeSinceCheckInMinutes != null && props.ticket.timeSinceCheckInMinutes >= 60
        ? 'text-amber-700 font-semibold'
        : ''
    case 'serviceCycleTimeLabel':
      return props.ticket.serviceCycleTimeMinutes != null && props.ticket.serviceCycleTimeMinutes >= 480
        ? 'text-red-700 font-semibold'
        : ''
    case 'inspectionCompletionLabel':
      return props.ticket.inspectionCompletionMinutes != null && props.ticket.inspectionCompletionMinutes >= 60
        ? 'text-amber-700 font-semibold'
        : ''
    default:
      return ''
  }
}

const { getApprovalsActionButtonClass, markApprovalsActionFlashDismissed } =
  useApprovalsActionButtonState(() => props.approvalUpdateTrigger)
const { getViewButtonClass, dismissViewButtonFlash } = useViewButtonState(() => props.viewStatusUpdateTrigger)
const { getInspectionViewButtonClass } = useInspectionViewButtonState(() => props.inspectionViewUpdateTrigger)

function getInspectionActionButtonClass(ticket: Ticket): string {
  const base = getInspectionButtonProps(ticket.inspectionStatus).className
  if (ticket.inspectionStatus !== 'complete') return base
  const flash = getInspectionViewButtonClass(ticket.ticketNumber)
  return cn(base, flash)
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case "Q":
      return "Quote"
    case "W":
      return "Workorder"
    case "I":
      return "Invoice"
    case "B":
      return "Batch"
    default:
      return type
  }
}

// State
const localVehicleStatus = ref(props.ticket.vehicleStatus || "Not Started")
const showStatusPopover = ref(false)
const collapsedSummaryStatusRef = ref<HTMLElement | null>(null)
const statusRef = ref<HTMLElement | null>(null)
const badgeRef = ref<HTMLElement | ComponentPublicInstance | null>(null)
const popoverRef = ref<HTMLElement | null>(null)
const popoverPosition = ref({ top: 0, left: 0, maxHeight: 320 })
const popoverAnchorRef = ref<HTMLElement | ComponentPublicInstance | null>(null)

function asHtmlElement(node: unknown): HTMLElement | null {
  if (node instanceof HTMLElement) return node
  if (node && typeof node === 'object' && '$el' in node) {
    const el = (node as { $el: unknown }).$el
    if (el instanceof HTMLElement) return el
  }
  return null
}

const statusFlags = computed<DerivedStatusFlags>(() =>
  getTicketStatusFlags(props.ticket, props.statusMeta)
)

const CATEGORY_LABEL_MAP: Record<DisplayFieldCategory, string> = DISPLAY_FIELD_CATEGORIES.reduce(
  (acc, category) => {
    acc[category.id] = category.label
    return acc
  },
  {} as Record<DisplayFieldCategory, string>
)

type Section = {
  id: DisplayFieldCategory
  label: string
  fields: DisplayFieldConfig[]
}

// Sections for Customer, Vehicle, Scheduling, Routing based on selected fields and available data
const dynamicSections = computed<Section[]>(() => {
  const sections: Section[] = []
  const order: DisplayFieldCategory[] = ['customer', 'vehicle', 'scheduling', 'routing']
  const ticketAny = props.ticket as Record<string, unknown>

  for (const id of order) {
    const allFields = props.fieldsByCategory?.[id] ?? []
    const fieldsWithValues = allFields.filter((field) => {
      // Vehicle status is shown via the header badge; omit it from the vehicle subcard.
      if (field.key === 'vehicleStatus') return false
      const raw = ticketAny[field.key as keyof typeof ticketAny]
      if (raw === null || raw === undefined) return false
      if (typeof raw === 'string' && raw.trim() === '') return false
      return true
    })

    if (fieldsWithValues.length > 0) {
      sections.push({
        id,
        label: CATEGORY_LABEL_MAP[id] ?? id,
        fields: fieldsWithValues,
      })
    }
  }

  return sections
})

// Display status - show "Not Started" if empty
const displayStatus = computed(() => localVehicleStatus.value || "Not Started")

// Visibility controls based on selected card fields (fallback to previous behavior when undefined)
const hasStatusFlagsSection = computed(() => {
  if (!props.visibleFieldKeys || props.visibleFieldKeys.length === 0) return true
  return (
    props.visibleFieldKeys.includes('statusFlags') ||
    props.visibleFieldKeys.includes('viewedStatus') ||
    props.visibleFieldKeys.includes('approvedStatus')
  )
})

const showApprovedBadge = computed(() => {
  if (!props.visibleFieldKeys || props.visibleFieldKeys.length === 0) return true
  return props.visibleFieldKeys.includes('statusFlags') || props.visibleFieldKeys.includes('approvedStatus')
})

const showViewedBadge = computed(() => {
  if (!props.visibleFieldKeys || props.visibleFieldKeys.length === 0) return true
  return props.visibleFieldKeys.includes('statusFlags') || props.visibleFieldKeys.includes('viewedStatus')
})

const hasVehicleStatusSection = computed(() => {
  if (!props.visibleFieldKeys || props.visibleFieldKeys.length === 0) return true
  return props.visibleFieldKeys.includes('vehicleStatus')
})

const hasNameField = computed(() => {
  if (!props.visibleFieldKeys || props.visibleFieldKeys.length === 0) return true
  return props.visibleFieldKeys.includes('name')
})

const hasVehicleField = computed(() => {
  if (!props.visibleFieldKeys || props.visibleFieldKeys.length === 0) return true
  return props.visibleFieldKeys.includes('vehicle')
})

const hasTicketNumberField = computed(() => {
  if (!props.visibleFieldKeys || props.visibleFieldKeys.length === 0) return true
  return props.visibleFieldKeys.includes('ticketNumber')
})

const hasTicketTypeField = computed(() => {
  if (!props.visibleFieldKeys || props.visibleFieldKeys.length === 0) return true
  return props.visibleFieldKeys.includes('type')
})

const hasDateField = computed(() => {
  if (!props.visibleFieldKeys || props.visibleFieldKeys.length === 0) return true
  return props.visibleFieldKeys.includes('date')
})

const hasSalesrepField = computed(() => {
  if (!props.visibleFieldKeys || props.visibleFieldKeys.length === 0) return true
  return props.visibleFieldKeys.includes('salesrep')
})

const hasTechnicianField = computed(() => {
  if (!props.visibleFieldKeys || props.visibleFieldKeys.length === 0) return true
  return props.visibleFieldKeys.includes('technician')
})

const hasBayField = computed(() => {
  if (!props.visibleFieldKeys || props.visibleFieldKeys.length === 0) return false
  return props.visibleFieldKeys.includes('bay')
})

const hasSubtotalField = computed(() => {
  if (!props.visibleFieldKeys || props.visibleFieldKeys.length === 0) return true
  return props.visibleFieldKeys.includes('subtotal')
})

const hasSalesTaxField = computed(() => {
  if (!props.visibleFieldKeys || props.visibleFieldKeys.length === 0) return true
  return props.visibleFieldKeys.includes('salesTax')
})

const hasCostField = computed(() => {
  if (!props.visibleFieldKeys || props.visibleFieldKeys.length === 0) return true
  return props.visibleFieldKeys.includes('cost')
})

const hasGpPercentField = computed(() => {
  if (!props.visibleFieldKeys || props.visibleFieldKeys.length === 0) return true
  return props.visibleFieldKeys.includes('gpPercent')
})

const hasTotalField = computed(() => {
  if (!props.visibleFieldKeys || props.visibleFieldKeys.length === 0) return true
  return props.visibleFieldKeys.includes('total')
})

const nextAction = computed(() => getNextAction(props.ticket))

const hasAnyTicketInfoFields = computed(() =>
  hasSubtotalField.value || hasSalesTaxField.value || hasCostField.value || hasGpPercentField.value
)

const bayValue = computed(() => {
  const raw = props.ticket.bay
  if (raw === null || raw === undefined) return ''
  const trimmed = String(raw).trim()
  // Treat 0/"0"/"No Bay" as "no bay selected"
  if (
    trimmed === '' ||
    trimmed === '0' ||
    trimmed.toLowerCase() === 'no bay'
  ) {
    return ''
  }
  return trimmed
})

const showStaffOrStatusSection = computed(
  () => hasSalesrepField.value || hasTechnicianField.value || hasVehicleStatusSection.value
)

const isMobile = ref(typeof window !== 'undefined' && window.innerWidth < 640)
/** On narrow viewports, start collapsed; expanding shows the same detail as desktop. */
const mobileCardExpanded = ref(typeof window === 'undefined' || window.innerWidth >= 640)

/** When true, dynamic sections, totals, and staff/status block are visible (full card body). */
const detailVisible = computed(() => !isMobile.value || mobileCardExpanded.value)

const updateIsMobile = () => {
  if (typeof window === 'undefined') return
  isMobile.value = window.innerWidth < 640
}

const formatDurationMinutes = (minutes: number): string => {
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

const getFieldDisplayValue = (key: string): string => {
  const value = (props.ticket as any)[key]
  if (key === 'inspectionStatus') {
    const normalized = String(value ?? '').trim().toLowerCase()
    return normalized === '' || normalized === 'none' ? '' : String(value)
  }
  if (value === null || value === undefined || value === '') {
    return '—'
  }
  if (['total', 'subtotal', 'salesTax', 'cost'].includes(key) && typeof value === 'number') {
    return formatCurrency(value)
  }
  if (key === 'gpPercent' && typeof value === 'number') {
    return `${value.toFixed(1)}%`
  }
  if (key === 'apptDurationMinutes' && typeof value === 'number') {
    return formatDurationMinutes(value)
  }
  return String(value)
}

const viewButtonClass = computed(() =>
  props.ticket.tourDemoInvoiceViewed
    ? VIEW_BUTTON_SOLID_VIEWED_CLASS
    : getViewButtonClass(props.ticket.ticketNumber),
)

const tourDemoChatAccentClass = computed(() => {
  if (props.ticket.tourDemoRowActionAccent !== 'chat') return ''
  return cn(
    TOUR_DEMO_ROW_ACTION_ACCENT_CLASS,
    props.ticket.tourDemoChatActionPulse ? 'animate-pulse' : '',
  )
})

const approvalsButtonClass = computed(() => {
  if (props.ticket.tourDemoApprovalsSolidGreen) return TOUR_DEMO_APPROVALS_SOLID_GREEN_CLASS
  if (props.ticket.tourDemoRowActionAccent === 'approvals') {
    return TOUR_DEMO_ROW_ACTION_ACCENT_CLASS
  }
  return getApprovalsActionButtonClass(props.ticket.ticketNumber)
})

onMounted(() => {
  updateIsMobile()
  if (typeof window !== 'undefined') {
    // Align with viewport after mount (SSR / delayed layout).
    mobileCardExpanded.value = window.innerWidth >= 640
    window.addEventListener('resize', updateIsMobile)
  }
})

// Crossing the sm breakpoint: collapse on mobile for a predictable list; expand on desktop.
watch(isMobile, (mobile) => {
  if (mobile) {
    mobileCardExpanded.value = false
  } else {
    mobileCardExpanded.value = true
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateIsMobile)
  }
})

// Sync local state with prop changes
watch(() => props.ticket.vehicleStatus, (newVal) => {
  localVehicleStatus.value = newVal || "Not Started"
})

const emit = defineEmits<{
  view: [ticket: Ticket]
  'open-view-panel': [ticket: Ticket]
  chat: [ticket: Ticket, anchor?: MouseEvent]
  timeline: [ticket: Ticket]
  approvals: [ticket: Ticket]
  editStatus: [ticket: Ticket]
  inspection: [ticket: Ticket]
  action: [ticket: Ticket, action: string]
  update: [ticketId: number, updates: { vehicleStatus?: string; inspectionId?: string }]
}>()

const handleTimelineClick = () => {
  emit('timeline', props.ticket)
}

const handleApprovalsClick = () => {
  markApprovalsActionFlashDismissed(props.ticket.ticketNumber)
  emit('approvals', props.ticket)
}

const handleViewClick = () => {
  dismissViewButtonFlash(props.ticket.ticketNumber)
  emit('view', props.ticket)
}

const handleCardDblClick = (e: MouseEvent) => {
  const el = e.target as HTMLElement | null
  if (el?.closest('button, a, [role="button"]')) return
  if (!props.canViewCost || !ticketActionVisibility.value.view) return
  if (props.loadingTicketNumber === props.ticket.ticketNumber) return
  dismissViewButtonFlash(props.ticket.ticketNumber)
  emit('open-view-panel', props.ticket)
}

const handleNextStepClick = () => {
  const next = nextAction.value
  if (next) emit('action', props.ticket, next.action)
}

const handleVehicleStatusChange = (value: string) => {
  localVehicleStatus.value = value
  showStatusPopover.value = false
  emit('update', props.ticket.id, { vehicleStatus: value })
}

const toggleStatusPopover = () => {
  popoverAnchorRef.value = badgeRef.value
  showStatusPopover.value = !showStatusPopover.value
}

// Calculate popover position
watch(showStatusPopover, (isOpen) => {
  if (isOpen) {
    const updatePosition = () => {
      const targetEl =
        asHtmlElement(popoverAnchorRef.value) ?? asHtmlElement(badgeRef.value)
      if (!targetEl) return

      const rect = targetEl.getBoundingClientRect()
      const isMobile = window.innerWidth < 640 // sm breakpoint
      const popoverHeight = 320
      const popoverWidth = isMobile ? window.innerWidth - 32 : 224
      const padding = isMobile ? 16 : 8
      
      const spaceBelow = window.innerHeight - rect.bottom - padding
      const spaceAbove = rect.top - padding
      
      const showAbove = spaceBelow < popoverHeight && spaceAbove > spaceBelow
      
      let top: number
      let maxHeight: number
      
      if (showAbove) {
        const availableHeight = Math.min(popoverHeight, spaceAbove)
        top = rect.top - availableHeight - padding
        maxHeight = availableHeight
      } else {
        const availableHeight = Math.min(popoverHeight, spaceBelow)
        top = rect.bottom + padding
        maxHeight = availableHeight
      }
      
      if (top < padding) {
        top = padding
        maxHeight = Math.min(popoverHeight, window.innerHeight - top - padding)
      }
      
      if (top + maxHeight > window.innerHeight - padding) {
        maxHeight = window.innerHeight - top - padding
      }
      
      let left: number
      if (isMobile) {
        // Center on mobile
        left = (window.innerWidth - popoverWidth) / 2
      } else {
        left = rect.left
        if (left + popoverWidth > window.innerWidth - padding) {
          left = window.innerWidth - popoverWidth - padding
        }
        if (left < padding) {
          left = padding
        }
      }
      
      popoverPosition.value = {
        top,
        left,
        maxHeight: Math.max(150, maxHeight),
      }
    }
    
    updatePosition()
    
    const handleScroll = () => {
      requestAnimationFrame(updatePosition)
    }
    
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('orientationchange', updatePosition)
    
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('orientationchange', updatePosition)
    }
  }
}, { immediate: true })

// Close popover when clicking outside
watch(showStatusPopover, (isOpen) => {
  if (!isOpen) return
  
  const handleClickOutside = (event: MouseEvent) => {
    const badgeEl = asHtmlElement(badgeRef.value)
    const clickedOutsideStatusArea =
      (!collapsedSummaryStatusRef.value || !collapsedSummaryStatusRef.value.contains(event.target as Node)) &&
      (!statusRef.value || !statusRef.value.contains(event.target as Node)) &&
      (!badgeEl || !badgeEl.contains(event.target as Node))
    
    if (
      clickedOutsideStatusArea &&
      popoverRef.value &&
      !popoverRef.value.contains(event.target as Node)
    ) {
      showStatusPopover.value = false
    }
  }

  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      showStatusPopover.value = false
    }
  }

  document.addEventListener("mousedown", handleClickOutside, true)
  document.addEventListener("keydown", handleEscape, true)
  
  return () => {
    document.removeEventListener("mousedown", handleClickOutside, true)
    document.removeEventListener("keydown", handleEscape, true)
  }
})
</script>

<style scoped>
</style>
