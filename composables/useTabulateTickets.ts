import { computed, ref, watch } from 'vue'
import type { Ticket, TabulationDimension, TicketStatusMeta, VehicleStatus } from '@/types/ticket'
import {
  getInspectionStatusTabBucket,
  getTicketStatusFlags,
  INSPECTION_STATUS_TAB_ORDER,
} from '@/utils/ticketStatus'

export interface TabConfig {
  key: string
  label: string
  count: number
}

const VEHICLE_STATUS_ORDER: VehicleStatus[] = [
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

const TICKET_TYPE_LABELS: Record<string, string> = {
  Q: 'Quote',
  W: 'Workorder',
  I: 'Invoice',
  B: 'Batch',
}

const TICKET_TYPE_ORDER = ['Q', 'W', 'B', 'I'] as const

export function useTabulateTickets(
  tickets: () => Ticket[],
  tabulateBy: () => TabulationDimension,
  statusMeta?: () => Record<number, TicketStatusMeta>
) {
  const activeTab = ref<string>('')

  function groupTicketsByDimension(): Record<string, Ticket[]> {
    const list = tickets()
    const dim = tabulateBy()
    const grouped: Record<string, Ticket[]> = {}
    for (const ticket of list) {
      let key: string
      switch (dim) {
        case 'vehicleStatus':
          key = ticket.vehicleStatus || 'Not Started'
          break
        case 'ticketType':
          key = ticket.type
          break
        case 'technician':
          key = ticket.technician || 'Unassigned'
          break
        case 'salesRep':
          key = ticket.salesrep || 'Unassigned'
          break
        case 'approvedStatus':
          key = getTicketStatusFlags(ticket).isApproved ? 'Approved' : 'Not Approved'
          break
        case 'viewedStatus':
          key = getTicketStatusFlags(ticket).isViewed ? 'Viewed' : 'Not Viewed'
          break
        case 'overdueStatus':
          key = getTicketStatusFlags(ticket).isOverdue ? 'Overdue' : 'On Time'
          break
        case 'inspectionStatus':
          key = getInspectionStatusTabBucket(ticket, statusMeta?.()[ticket.id])
          break
        default:
          key = 'Other'
      }
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(ticket)
    }
    return grouped
  }

  function getTabLabel(key: string): string {
    if (tabulateBy() === 'ticketType') {
      return TICKET_TYPE_LABELS[key] || key
    }
    return key
  }

  const STATUS_TAB_ORDER: Record<string, number> = {
    Approved: 0,
    'Not Approved': 1,
    Viewed: 0,
    'Not Viewed': 1,
    Overdue: 0,
    'On Time': 1,
    'Inspection Not Started': 0,
    'Inspection Started': 1,
    'Inspection Complete': 2,
    'Inspection Sent': 3,
    'Inspection Viewed': 4,
  }

  const tabs = computed<TabConfig[]>(() => {
    const grouped = groupTicketsByDimension()
    const dim = tabulateBy()
    if (dim === 'inspectionStatus') {
      return INSPECTION_STATUS_TAB_ORDER.map((key) => {
        const list = grouped[key] || []
        return {
          key,
          label: getTabLabel(key),
          count: list.length,
        }
      })
    }
    return Object.entries(grouped)
      .map(([key, list]) => ({ key, label: getTabLabel(key), count: list.length }))
      .sort((a, b) => {
        if (dim === 'vehicleStatus') {
          const aIdx = VEHICLE_STATUS_ORDER.indexOf(a.key as VehicleStatus)
          const bIdx = VEHICLE_STATUS_ORDER.indexOf(b.key as VehicleStatus)
          return aIdx - bIdx
        }
        if (dim === 'ticketType') {
          const aIdx = TICKET_TYPE_ORDER.indexOf(a.key as (typeof TICKET_TYPE_ORDER)[number])
          const bIdx = TICKET_TYPE_ORDER.indexOf(b.key as (typeof TICKET_TYPE_ORDER)[number])
          return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
        }
        const statusDims: TabulationDimension[] = [
          'approvedStatus',
          'viewedStatus',
          'overdueStatus',
          'inspectionStatus',
        ]
        if (statusDims.includes(dim)) {
          const aOrd = STATUS_TAB_ORDER[a.key] ?? 999
          const bOrd = STATUS_TAB_ORDER[b.key] ?? 999
          return aOrd - bOrd
        }
        return a.label.localeCompare(b.label)
      })
  })

  const activeTabTickets = computed<Ticket[]>(() => {
    if (!activeTab.value) return []
    const grouped = groupTicketsByDimension()
    return grouped[activeTab.value] || []
  })

  const tabulateByValue = computed(() => tabulateBy())

  watch(
    tabs,
    (newTabs) => {
      if (newTabs.length > 0 && (!activeTab.value || !newTabs.find((t) => t.key === activeTab.value))) {
        activeTab.value = newTabs[0].key
      }
    },
    { immediate: true }
  )

  watch(tabulateByValue, () => {
    const newTabs = tabs.value
    if (newTabs.length > 0) {
      activeTab.value = newTabs[0].key
    }
  })

  return { tabs, activeTab, activeTabTickets, groupTicketsByDimension, getTabLabel }
}
