<template>
  <div class="flex flex-col">
    <div class="p-4 border-b border-slate-200">
      <h3 class="text-lg font-semibold text-slate-900">Timeline</h3>
    </div>
    
    <div class="p-4">
      <div class="relative">
        <!-- Timeline line -->
        <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200"></div>
        
        <div class="space-y-6">
          <!-- All Timeline Events (sorted chronologically) -->
          <template v-for="(event, index) in sortedEvents" :key="`event-${index}`">
            <!-- Ticket Sent Event -->
            <div v-if="event.type === 'ticketSent'" class="relative pl-10">
              <div class="absolute left-0 top-1 w-8 h-8 rounded-full bg-blue-500 border-4 border-white flex items-center justify-center">
                <svg aria-hidden="true" focusable="false" class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div class="bg-white rounded-lg border border-slate-200 p-3">
                <p class="text-sm font-semibold text-slate-900">Ticket Sent</p>
                <p v-if="isAdvisorView && event.sentBy" class="text-xs text-slate-600 mt-1">Sent by {{ event.sentBy }}</p>
                <p class="text-xs text-slate-600 mt-1">{{ formatDateTime(event.timestamp) }}</p>
              </div>
            </div>

            <!-- Ticket Viewed Event (red pulsing border when customer is actively viewing, same 5 min as view button) -->
            <div
              v-if="event.type === 'ticketViewed'"
              class="relative pl-10"
            >
              <div class="absolute left-0 top-1 w-8 h-8 rounded-full bg-green-500 border-4 border-white flex items-center justify-center">
                <svg aria-hidden="true" focusable="false" class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div
                class="bg-white rounded-lg p-3"
                :class="props.isTicketViewedPulsing ? 'timeline-viewed-pulse-border' : 'border border-slate-200'"
              >
                <p class="text-sm font-semibold text-slate-900">{{ props.isTicketViewedPulsing ? 'Customer Viewing Ticket' : 'Ticket Viewed' }}</p>
                <p class="text-xs text-slate-600 mt-1">{{ formatDateTime(event.timestamp) }}</p>
              </div>
            </div>

            <!-- Work Approved Event (combined with "View Approval Details" when hasApprovals) -->
            <div v-if="event.type === 'workApproved'" class="relative pl-10">
              <div class="absolute left-0 top-1 w-8 h-8 rounded-full bg-brand-accent border-4 border-white flex items-center justify-center">
                <svg aria-hidden="true" focusable="false" class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div
                v-if="isLastWorkApprovedAndHasApprovals(index)"
                class="bg-white rounded-lg border border-slate-200 p-3"
              >
                <button
                  type="button"
                  class="w-full text-left"
                  @click="$emit('show-approvals')"
                >
                  <p class="text-sm font-semibold text-slate-900">Work Approved</p>
                  <p class="text-xs text-slate-600 mt-1">{{ formatDateTime(event.timestamp) }}</p>
                  <p class="text-xs text-slate-600 mt-1">Click to view approval details</p>
                </button>
              </div>
              <div v-else class="bg-white rounded-lg border border-slate-200 p-3">
                  <p class="text-sm font-semibold text-slate-900">Work Approved</p>
                <p class="text-xs text-slate-600 mt-1">{{ formatDateTime(event.timestamp) }}</p>
              </div>
            </div>

            <!-- Inspection Sent (advisor only; mirrors Ticket Sent) -->
            <div v-if="event.type === 'inspectionSent'" class="relative pl-10">
              <div class="absolute left-0 top-1 w-8 h-8 rounded-full bg-indigo-500 border-4 border-white flex items-center justify-center">
                <svg aria-hidden="true" focusable="false" class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div class="bg-white rounded-lg border border-slate-200 p-3">
                <p class="text-sm font-semibold text-slate-900">Inspection Sent</p>
                <p v-if="isAdvisorView && event.sentBy" class="text-xs text-slate-600 mt-1">Sent by {{ event.sentBy }}</p>
                <p class="text-xs text-slate-600 mt-1">{{ formatDateTime(event.timestamp) }}</p>
              </div>
            </div>

            <!-- Inspection Viewed (pulse when customer actively viewing inspection, same 5 min as inspection button) -->
            <div
              v-if="event.type === 'inspectionViewed'"
              class="relative pl-10"
            >
              <div class="absolute left-0 top-1 w-8 h-8 rounded-full bg-teal-500 border-4 border-white flex items-center justify-center">
                <svg aria-hidden="true" focusable="false" class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div
                class="bg-white rounded-lg p-3"
                :class="props.isInspectionViewedPulsing ? 'timeline-viewed-pulse-border' : 'border border-slate-200'"
              >
                <p class="text-sm font-semibold text-slate-900">{{ props.isInspectionViewedPulsing ? 'Customer Viewing Inspection' : 'Inspection Viewed' }}</p>
                <p class="text-xs text-slate-600 mt-1">{{ formatDateTime(event.timestamp) }}</p>
              </div>
            </div>

            <!-- Vehicle Status Changed Event -->
            <div v-if="event.type === 'statusChanged'" class="relative pl-10">
              <div class="absolute left-0 top-1 w-8 h-8 rounded-full bg-amber-500 border-4 border-white flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="bg-white rounded-lg border border-slate-200 p-3">
                <p class="text-sm font-semibold text-slate-900">{{ event.status ?? 'Vehicle Status Changed' }}</p>
                <p class="text-xs text-slate-600 mt-1">{{ formatDateTime(event.timestamp) }}</p>
              </div>
            </div>
          </template>

          <!-- Approvals Button (only when has approvals but no Work Approved event in timeline) -->
          <div v-if="hasApprovals && lastWorkApprovedIndex === -1" class="relative pl-10">
            <div class="absolute left-0 top-1 w-8 h-8 rounded-full bg-slate-300 border-4 border-white flex items-center justify-center">
              <svg aria-hidden="true" focusable="false" class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div class="bg-white rounded-lg border border-slate-200 p-3">
              <button
                type="button"
                class="w-full text-left"
                @click="$emit('show-approvals')"
              >
                <p class="text-sm font-semibold text-slate-900">View Approval Details</p>
                <p class="text-xs text-slate-600 mt-1">Click to view all approved services</p>
              </button>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="sortedEvents.length === 0 && !hasApprovals" class="relative pl-10">
            <div class="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <p class="text-sm text-slate-600 text-center">No timeline events yet</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface TimelineData {
  ticketSentEvents: Array<{ timestamp: number; sentBy?: string }>
  ticketViewed: number | null // timestamp
  inspectionSentEvents: Array<{ timestamp: number; sentBy?: string; inspectionId?: string }>
  inspectionViewed: number | null
  workApprovals: Array<{
    timestamp: number
    approvedDate: string
    approvedTime: string
    verbalApproval?: boolean
    approverName?: string
    hasSignature?: boolean
  }>
  currentVehicleStatus: string | null // current status
  vehicleStatusChanges: Array<{
    status: string
    timestamp: number
  }>
}

interface Props {
  timelineData: TimelineData
  hasApprovals: boolean
  isAdvisorView?: boolean // Whether this is advisor view (to show user info)
  isTicketViewedPulsing?: boolean // When true, pulse the "Ticket Viewed" event (customer actively viewing, same 5 min as view button)
  isInspectionViewedPulsing?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isTicketViewedPulsing: false,
  isInspectionViewedPulsing: false,
})

defineEmits<{
  'show-approvals': []
}>()

const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${dateStr} at ${timeStr}`
}

// Combine all events and sort chronologically
const sortedEvents = computed(() => {
  const events: Array<{
    type:
      | 'ticketSent'
      | 'ticketViewed'
      | 'inspectionSent'
      | 'inspectionViewed'
      | 'workApproved'
      | 'statusChanged'
    timestamp: number
    sentBy?: string
    status?: string
    verbalApproval?: boolean
    approverName?: string
    hasSignature?: boolean
  }> = []

  const inspectionSent = props.timelineData.inspectionSentEvents ?? []
  const inspectionViewedTs = props.timelineData.inspectionViewed ?? null

  // Add ticket sent events only for advisor view (customer should not see who sent the customer view)
  if (props.isAdvisorView) {
    props.timelineData.ticketSentEvents.forEach((event) => {
      events.push({
        type: 'ticketSent',
        timestamp: event.timestamp,
        sentBy: event.sentBy,
      })
    })
    inspectionSent.forEach((event) => {
      events.push({
        type: 'inspectionSent',
        timestamp: event.timestamp,
        sentBy: event.sentBy,
      })
    })
  }

  // Add ticket viewed event
  if (props.timelineData.ticketViewed) {
    events.push({
      type: 'ticketViewed',
      timestamp: props.timelineData.ticketViewed,
    })
  }

  if (inspectionViewedTs) {
    events.push({
      type: 'inspectionViewed',
      timestamp: inspectionViewedTs,
    })
  }

  // Add work approval events (already combined - one entry per ticket)
  props.timelineData.workApprovals.forEach((approval) => {
    events.push({
      type: 'workApproved',
      timestamp: approval.timestamp,
      verbalApproval: approval.verbalApproval,
      approverName: approval.approverName,
      hasSignature: approval.hasSignature,
    })
  })

  // Add vehicle status change events
  props.timelineData.vehicleStatusChanges.forEach((change) => {
    events.push({
      type: 'statusChanged',
      timestamp: change.timestamp,
      status: change.status,
    })
  })

  // Sort by timestamp (oldest first)
  return events.sort((a, b) => a.timestamp - b.timestamp)
})

// Index in sortedEvents of the last Work Approved event (-1 if none)
const lastWorkApprovedIndex = computed(() => {
  let last = -1
  sortedEvents.value.forEach((e, i) => {
    if (e.type === 'workApproved') last = i
  })
  return last
})

function isLastWorkApprovedAndHasApprovals(index: number): boolean {
  return props.hasApprovals && index === lastWorkApprovedIndex.value
}
</script>

<style scoped>
@keyframes timeline-viewed-pulse-border {
  0%, 100% {
    border-color: rgb(220 38 38); /* red-600 */
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.5);
  }
  50% {
    border-color: rgb(185 28 28); /* red-700 */
    box-shadow: 0 0 0 6px rgba(220, 38, 38, 0.15);
  }
}

.timeline-viewed-pulse-border {
  border-width: 2px;
  border-style: solid;
  animation: timeline-viewed-pulse-border 1.5s ease-in-out infinite;
}
</style>
