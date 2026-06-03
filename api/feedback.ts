import type { Ticket, TicketFilters } from '@/types/ticket'
import { fetchTickets } from './tickets'

export interface FeedbackFilters {
  dateRange?: string
  customFromDate?: string // MM/DD/YYYY format
  customToDate?: string // MM/DD/YYYY format
  overdueOnly?: boolean
  declinedOnly?: boolean
}

/**
 * Checks if an invoice is overdue (over 1 week old)
 */
function isOverdue(ticket: Ticket): boolean {
  if (!ticket.date) return false
  
  // Parse date from MM/DD/YYYY format
  const dateParts = ticket.date.split('/')
  if (dateParts.length !== 3) return false
  
  const ticketDate = new Date(
    parseInt(dateParts[2]), // year
    parseInt(dateParts[0]) - 1, // month (0-indexed)
    parseInt(dateParts[1]) // day
  )
  
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset to start of day
  ticketDate.setHours(0, 0, 0, 0)
  
  // Calculate difference in days
  const diffTime = today.getTime() - ticketDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  // Overdue if more than 7 days old
  return diffDays > 7
}

/**
 * Fetches invoices for feedback from the API
 * Defaults to past 3 months if no date range is specified
 */
export async function fetchFeedbackInvoices(filters: FeedbackFilters): Promise<Ticket[]> {
  try {
    // Default to past 3 months if no date range specified
    const now = new Date()
    const threeMonthsAgo = new Date(now)
    threeMonthsAgo.setMonth(now.getMonth() - 3)
    
    // Handle "Past 3 Months" date range
    let dateRange = filters.dateRange || 'Custom Date Range'
    let customFromDate = filters.customFromDate
    let customToDate = filters.customToDate
    
    if (dateRange === 'Past 3 Months') {
      dateRange = 'Custom Date Range'
      customFromDate = formatDateForApi(threeMonthsAgo)
      customToDate = formatDateForApi(now)
    } else if (!customFromDate || !customToDate) {
      // If no custom dates and not "Past 3 Months", default to past 3 months
      customFromDate = formatDateForApi(threeMonthsAgo)
      customToDate = formatDateForApi(now)
    }
    
    // Build ticket filters - fetch invoices only (type 'I')
    const ticketFilters: TicketFilters = {
      dateRange,
      customFromDate,
      customToDate,
      workorder: false,
      invoice: true, // Only invoices
      batch: false,
      quote: false,
      status: 'All Statuses',
      search: '',
    }

    // Fetch all invoices in the date range
    let invoices = await fetchTickets(ticketFilters)

    // Filter by overdue if requested
    if (filters.overdueOnly) {
      invoices = invoices.filter((invoice) => isOverdue(invoice))
    }

    return invoices
  } catch (error) {
    console.error('Error fetching feedback invoices:', error)
    return []
  }
}

/**
 * Formats a Date object to MM/DD/YYYY string format
 */
function formatDateForApi(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  return `${month}/${day}/${year}`
}

/**
 * Exported function to check if a ticket is overdue (for use in components)
 */
export { isOverdue }
