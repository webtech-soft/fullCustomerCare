import type { Ticket } from '@/types/ticket'

export interface TicketNextAction {
  label: string
  action: string
}

export function getNextAction(ticket: Ticket): TicketNextAction | null {
  const status = ticket.vehicleStatus || 'Not Started'

  switch (status) {
    case 'Not Started':
    case 'Online Appointment':
    case 'Not Here Yet':
      return { label: 'Check In', action: 'checkIn' }
    case 'Check In':
    case 'On Lot':
      return { label: 'Start Work', action: 'startWork' }
    case 'In Shop':
      return { label: 'Complete Inspection', action: 'completeInspection' }
    case 'Inspection Complete':
      return { label: 'Send to Customer', action: 'sendToCustomer' }
    case 'Awaiting Callback':
      return { label: 'Mark Ready', action: 'markReady' }
    case 'Awaiting Parts':
      return { label: 'Parts Arrived', action: 'partsArrived' }
    case 'Out For Sublet':
      return { label: 'Mark Ready', action: 'markReady' }
    default:
      return null
  }
}
