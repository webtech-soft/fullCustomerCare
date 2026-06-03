import type { Ticket } from '@/types/ticket'

import { HITS_ACCOUNT } from '@/config/hitsAccount'

// Inspections API endpoint
// Use proxy in development to avoid CORS issues
const INSPECTIONS_API_URL = import.meta.env.DEV 
  ? '/api/inspections' 
  : 'https://hitsdigital-portal.com/apps/app-function.php'
const ACCOUNT = HITS_ACCOUNT
const STORE = 3

export interface InspectionFilters {
  dateRange?: string
  customFromDate?: string // MM/DD/YYYY format
  customToDate?: string // MM/DD/YYYY format
  technician?: string
  salesrep?: string
  inspectionStatus?: string // 'incomplete' | 'complete' | 'All Statuses'
}

export interface InspectionApiResponse {
  success?: boolean
  error?: string
  data?: any[]
  inspections?: any[]
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
 * Calculates date range from filter options
 */
function getDateRange(filters: InspectionFilters): { fromDate: Date; toDate: Date } {
  const now = new Date()
  let fromDate = new Date()
  let toDate = new Date()

  // Handle custom date range
  if (filters.dateRange === 'Custom Date Range' && filters.customFromDate && filters.customToDate) {
    // Parse MM/DD/YYYY format
    const fromParts = filters.customFromDate.split('/')
    const toParts = filters.customToDate.split('/')
    if (fromParts.length === 3 && toParts.length === 3) {
      fromDate = new Date(parseInt(fromParts[2]), parseInt(fromParts[0]) - 1, parseInt(fromParts[1]))
      toDate = new Date(parseInt(toParts[2]), parseInt(toParts[0]) - 1, parseInt(toParts[1]))
    }
  } else {
    // Calculate date range for predefined options
    switch (filters.dateRange) {
      case 'Today':
        // fromDate and toDate are already set to today
        break
      case 'Yesterday':
        fromDate.setDate(now.getDate() - 1)
        toDate.setDate(now.getDate() - 1)
        break
      case 'Tomorrow':
        fromDate.setDate(now.getDate() + 1)
        toDate.setDate(now.getDate() + 1)
        break
      case 'This Week': {
        // Weeks start on Monday (PHP legacy: not Sunday)
        const daysSinceMonday = (now.getDay() + 6) % 7
        fromDate.setDate(now.getDate() - daysSinceMonday)
        break
      }
      case 'Last Week': {
        // Last week = previous Monday through Sunday
        const daysSinceMonday = (now.getDay() + 6) % 7
        const lastWeekStart = new Date(now)
        lastWeekStart.setDate(now.getDate() - daysSinceMonday - 7)
        fromDate = lastWeekStart
        toDate = new Date(lastWeekStart)
        toDate.setDate(lastWeekStart.getDate() + 6)
        break
      }
      case 'This Month':
        fromDate.setDate(1) // First day of month
        break
      case 'Last Month':
        fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        toDate = new Date(now.getFullYear(), now.getMonth(), 0) // Last day of last month
        break
      case 'This Quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3)
        fromDate = new Date(now.getFullYear(), currentQuarter * 3, 1)
        break
      case 'Last Quarter':
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1
        const lastQuarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear()
        const lastQuarterMonth = lastQuarter < 0 ? 9 : lastQuarter * 3
        fromDate = new Date(lastQuarterYear, lastQuarterMonth, 1)
        toDate = new Date(lastQuarterYear, lastQuarterMonth + 3, 0) // Last day of last quarter
        break
      case 'This Year':
        fromDate.setMonth(0, 1) // January 1st
        break
      case 'Last Year':
        fromDate = new Date(now.getFullYear() - 1, 0, 1)
        toDate = new Date(now.getFullYear() - 1, 11, 31)
        break
      default:
        // Default to this year if not specified
        fromDate.setMonth(0, 1)
        break
    }
  }

  return { fromDate, toDate }
}

/**
 * Builds query parameters for inspections API
 */
function buildQueryParams(filters: InspectionFilters): URLSearchParams {
  const params = new URLSearchParams()
  
  params.append('isRequest', '1')
  params.append('account', ACCOUNT)
  params.append('store', STORE.toString())
  
  // Map inspection status: 0 = incomplete, 1 = complete
  // If "All Statuses", include both
  if (filters.inspectionStatus && filters.inspectionStatus !== 'All Statuses') {
    if (filters.inspectionStatus === 'incomplete') {
      params.append('insp_status[]', '0')
    } else if (filters.inspectionStatus === 'complete') {
      params.append('insp_status[]', '1')
    }
  } else {
    // Include both statuses for "All Statuses"
    params.append('insp_status[]', '0')
    params.append('insp_status[]', '1')
  }
  
  // Date range
  const { fromDate, toDate } = getDateRange(filters)
  const dateRange = `${formatDateForApi(fromDate)}|${formatDateForApi(toDate)}`
  params.append('date', dateRange)
  
  // Date order (11 = descending, newest first)
  params.append('dateOrder', '11')
  
  // Technician filter
  // If technician is selected, we'll need to filter client-side or use searchTechnician
  // Based on the example, searchTechnician=0 means all technicians
  // We'll filter client-side for now
  params.append('searchTechnician', '0')
  
  return params
}

/**
 * Maps inspection API response to Ticket interface
 * This is a placeholder - adjust based on actual API response structure
 */
function mapInspectionToTicket(inspection: any, index: number): Ticket {
  // TODO: Adjust this mapping based on actual API response structure
  return {
    id: inspection.id || inspection.ticketNumber || index,
    ticketNumber: inspection.ticketNumber || inspection.ticket_num || 0,
    date: inspection.date || inspection.dateCreated || '',
    type: (inspection.type || 'W') as Ticket['type'],
    salesrep: inspection.salesrep || inspection.sales_rep || '',
    technician: inspection.technician || inspection.tech_name || '',
    name: inspection.name || inspection.customer_name || '',
    vehicle: inspection.vehicle || `${inspection.make || ''} ${inspection.model || ''} ${inspection.year || ''} (${inspection.license_plate || ''})`.trim(),
    total: parseFloat(inspection.total || inspection.amount || '0') || 0,
    vehicleStatus: (inspection.vehicleStatus || inspection.veh_status || '') as Ticket['vehicleStatus'],
    inspectionStatus: inspection.inspectionStatus || (inspection.status === 1 ? 'complete' : 'incomplete') || 'incomplete',
    inspectionId: inspection.inspectionId || inspection.inspection_id || undefined,
    mileage: inspection.mileage || inspection.mileage_num || undefined,
  }
}

/**
 * Fetches inspections from the API
 */
export async function fetchInspections(filters: InspectionFilters): Promise<Ticket[]> {
  try {
    const params = buildQueryParams(filters)
    const url = `${INSPECTIONS_API_URL}?action=APPS_all_inspection&${params.toString()}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'omit',
      mode: 'cors',
    })

    if (!response.ok) {
      let errorMessage = `API request failed: ${response.status} ${response.statusText}`
      
      try {
        const errorData = await response.json()
        if (errorData.error) {
          errorMessage = `API Error (${response.status}): ${errorData.error}`
        } else if (errorData.message) {
          errorMessage = `API Error (${response.status}): ${errorData.message}`
        } else {
          errorMessage = `API Error (${response.status}): ${JSON.stringify(errorData)}`
        }
      } catch {
        try {
          const errorText = await response.text()
          if (errorText) {
            errorMessage = `API Error (${response.status}): ${errorText}`
          }
        } catch {
          // Use default error message
        }
      }
      
      console.error('Inspections API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        url,
      })
      
      throw new Error(errorMessage)
    }

    // Try to parse as JSON
    let apiResponse: any
    try {
      const responseText = await response.text()
      apiResponse = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse API response as JSON:', parseError)
      console.error('Response might be HTML or another format')
      return []
    }
    
    // Handle different possible response structures
    // The response might be an array directly, or wrapped in an object
    let inspectionsData: any[] = []
    
    if (Array.isArray(apiResponse)) {
      inspectionsData = apiResponse
    } else if (apiResponse.data && Array.isArray(apiResponse.data)) {
      inspectionsData = apiResponse.data
    } else if (apiResponse.inspections && Array.isArray(apiResponse.inspections)) {
      inspectionsData = apiResponse.inspections
    } else if (apiResponse.success && apiResponse.data && Array.isArray(apiResponse.data)) {
      inspectionsData = apiResponse.data
    } else {
      console.warn('API returned unexpected data structure:', apiResponse)
      return []
    }
    
    // Map inspections to tickets
    let mappedTickets = inspectionsData.map((inspection, index) => 
      mapInspectionToTicket(inspection, index)
    )
    
    // Filter by technician if specified (client-side since API doesn't support it)
    if (filters.technician && filters.technician !== 'All Technicians') {
      mappedTickets = mappedTickets.filter(
        (ticket) => ticket.technician === filters.technician
      )
    }
    
    return mappedTickets
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('NetworkError')) {
      console.error('Network error: Unable to reach the inspections API. This may be due to CORS restrictions or network connectivity issues.')
    } else {
      console.error('Error fetching inspections:', error)
    }
    return []
  }
}

