import type { Ticket, TicketFilters } from '@/types/ticket'
import { fetchTickets } from './tickets'

export interface CheckInFilters {
  dateRange?: string
  customFromDate?: string // MM/DD/YYYY format
  customToDate?: string // MM/DD/YYYY format
  status?: string // 'in_progress' | 'completed' | 'All Statuses'
}

/**
 * Fetches check-in from the API
 * Check-in are tickets that are currently in "Check In" status (in progress)
 * or have progressed beyond it (completed)
 */
export async function fetchCheckIns(filters: CheckInFilters): Promise<Ticket[]> {
  try {
    // Build ticket filters - fetch all tickets in date range
    // We'll filter by check-in status client-side
    const ticketFilters: TicketFilters = {
      dateRange: filters.dateRange || 'Today',
      customFromDate: filters.customFromDate,
      customToDate: filters.customToDate,
      workorder: true,
      invoice: false,
      batch: false,
      quote: false,
      status: 'All Statuses', // Fetch all statuses, filter client-side
      search: '',
    }

    // Fetch all tickets in the date range
    const allTickets = await fetchTickets(ticketFilters)

    // Define status progression order - statuses that come after "Check In"
    const statusesAfterCheckIn = ['On Lot', 'In Shop', 'Inspection Complete', 'Awaiting Callback', 'Awaiting Parts', 'Out For Sublet', 'Ready']

    // Filter to get check-in (in progress or completed)
    let checkIns = allTickets.filter((ticket) => {
      // Include tickets that are in "Check In" status (in progress)
      if (ticket.vehicleStatus === 'Check In') {
        return true
      }
      // Include tickets that have progressed beyond "Check In" (completed)
      if (statusesAfterCheckIn.includes(ticket.vehicleStatus)) {
        return true
      }
      return false
    })

    // Apply status filter (in progress vs completed)
    if (filters.status && filters.status !== 'All Statuses') {
      if (filters.status === 'in_progress') {
        // In progress = still in "Check In" status
        checkIns = checkIns.filter((ticket) => ticket.vehicleStatus === 'Check In')
      } else if (filters.status === 'completed') {
        // Completed = has progressed beyond "Check In" status
        checkIns = checkIns.filter((ticket) => statusesAfterCheckIn.includes(ticket.vehicleStatus))
      }
    }

    return checkIns
  } catch (error) {
    console.error('Error fetching check-in:', error)
    return []
  }
}
