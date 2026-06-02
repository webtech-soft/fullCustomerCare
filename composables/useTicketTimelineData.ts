import { computed, type ComputedRef, type Ref } from 'vue'
import {
  getAllTicketSentEvents,
  getInvoiceViewStatus,
  getVehicleStatusChanges,
} from '@/lib/invoice-view-tracker'
import { getAllInspectionSentEvents, getInspectionViewStatus } from '@/lib/inspection-view-tracker'
import { getWorkApproval } from '@/lib/work-approvals'

/** Same contract as TimelinePanel `timelineData` prop */
export interface TicketTimelineData {
  ticketSentEvents: Array<{ timestamp: number; sentBy?: string }>
  ticketViewed: number | null
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
  currentVehicleStatus: string | null
  vehicleStatusChanges: Array<{
    status: string
    timestamp: number
  }>
}

const emptyTimeline = (): TicketTimelineData => ({
  ticketSentEvents: [],
  ticketViewed: null,
  inspectionSentEvents: [],
  inspectionViewed: null,
  workApprovals: [],
  currentVehicleStatus: null,
  vehicleStatusChanges: [],
})

/**
 * Reactive timeline for a ticket (localStorage + work approvals), aligned with CustomerInvoiceView.
 */
export function useTicketTimelineData(
  getTicketNumber: () => number | null | undefined,
  getCurrentVehicleStatus: () => string | null | undefined,
  triggers: {
    approval: Ref<number>
    vehicleStatus: Ref<number>
    viewStatus: Ref<number>
    inspectionView: Ref<number>
  }
): ComputedRef<TicketTimelineData> {
  return computed(() => {
    void triggers.approval.value
    void triggers.vehicleStatus.value
    void triggers.viewStatus.value
    void triggers.inspectionView.value

    const ticketNum = getTicketNumber()
    if (!ticketNum) {
      return emptyTimeline()
    }

    let ticketSentEvents: TicketTimelineData['ticketSentEvents'] = []
    if (typeof window !== 'undefined') {
      try {
        ticketSentEvents = getAllTicketSentEvents(ticketNum)
      } catch {
        ticketSentEvents = []
      }
    }

    const viewStatus = typeof window !== 'undefined' ? getInvoiceViewStatus(ticketNum) : null
    const ticketViewed = viewStatus?.firstViewed ?? null

    let inspectionSentEvents: TicketTimelineData['inspectionSentEvents'] = []
    if (typeof window !== 'undefined') {
      try {
        inspectionSentEvents = getAllInspectionSentEvents(ticketNum)
      } catch {
        inspectionSentEvents = []
      }
    }

    const inspectionViewStatus =
      typeof window !== 'undefined' ? getInspectionViewStatus(ticketNum) : null
    const inspectionViewed = inspectionViewStatus?.firstViewed ?? null

    let workApprovals: TicketTimelineData['workApprovals'] = []
    try {
      const approval = getWorkApproval(ticketNum)
      if (approval?.items?.length) {
        const approvalMap = new Map<
          string,
          {
            timestamp: number
            approvedDate: string
            approvedTime: string
            verbalApproval?: boolean
            approverName?: string
            hasSignature?: boolean
          }
        >()

        approval.items.forEach((item) => {
          const approvedAtIso = item.approvedAtIso
          if (!approvalMap.has(approvedAtIso)) {
            const timestamp = new Date(approvedAtIso).getTime()
            approvalMap.set(approvedAtIso, {
              timestamp,
              approvedDate: item.approvedDate,
              approvedTime: item.approvedTime,
              verbalApproval: item.verbalApproval,
              approverName: item.approverName,
              hasSignature: !!(item.signatureDataUrl && item.signatureDataUrl.length > 0),
            })
          }
        })

        const batches = Array.from(approvalMap.values()).sort((a, b) => a.timestamp - b.timestamp)
        if (batches.length > 0) {
          const latest = batches[batches.length - 1]
          const hasVerbal = batches.some((b) => b.verbalApproval)
          const verbalBatch = batches.find((b) => b.verbalApproval && b.approverName)
          workApprovals = [
            {
              timestamp: latest.timestamp,
              approvedDate: latest.approvedDate,
              approvedTime: latest.approvedTime,
              verbalApproval: hasVerbal,
              approverName: verbalBatch?.approverName,
              hasSignature: batches.some((b) => b.hasSignature),
            },
          ]
        }
      }
    } catch (err) {
      console.error('Error getting work approvals for timeline:', err)
      workApprovals = []
    }

    let vehicleStatusChanges: TicketTimelineData['vehicleStatusChanges'] = []
    if (typeof window !== 'undefined') {
      try {
        vehicleStatusChanges = getVehicleStatusChanges(ticketNum)
      } catch {
        vehicleStatusChanges = []
      }
    }

    const currentVehicleStatus = getCurrentVehicleStatus() ?? null

    return {
      ticketSentEvents,
      ticketViewed,
      inspectionSentEvents,
      inspectionViewed,
      workApprovals,
      currentVehicleStatus,
      vehicleStatusChanges,
    }
  })
}
