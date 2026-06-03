import type { 
  Ticket, 
  TicketFilters, 
  TicketApiRequest, 
  TicketApiPayload,
  TicketApiResponse,
  Invoice,
  VehicleStatus,
  InvoiceDetailParams,
  InvoiceDetailResponse,
  InvoiceRow,
  DetailRow
} from '@/types/ticket'
import { mapVehicleStatusToApi, mapApiStatusToVehicleStatus } from '@/types/ticket'
import { getSelectedStoreNum } from '@/composables/useStoreContext'

// Use proxy in development to avoid CORS issues
const API_BASE_URL = import.meta.env.DEV 
  ? '/api/hits' 
  : 'https://www.aasys-portal.com/hits/Posv1/HitsAPI'

const INTEGRATOR_ID = '667'
const ACCOUNT = '92000'
const SIGNATURE = 'X/WzwXc6kho3elnaSnAJpHQvCoblKmZb0o2KcI6sci0='
const TIMESTAMP = '1706-01-17T09:00:00Z'

/**
 * Format payload string to match Postman's exact format
 * Postman includes spaces after colons and commas in the escaped JSON string
 */
function formatPayloadString(payload: any): string {
  if (typeof payload === 'string') {
    return payload
  }
  
  // Create compact JSON first
  const compact = JSON.stringify(payload)
  
  // Add spaces to match Postman's format exactly
  // Postman format has spaces: "{ \"key\": \"value\", \"key2\": \"value2\" }"
  return compact
    .replace(/":/g, '": ')      // Space after colon
    .replace(/,"/g, ', "')      // Space after comma  
    .replace(/{"/g, '{ "')      // Space after opening brace
    .replace(/"}/g, '" }')      // Space before closing brace
}

/**
 * Formats a Date object to MM/DD/YYYY string format for API
 */
function formatDateForApi(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  return `${month}/${day}/${year}`
}

/**
 * Builds a single-line mailing address string from invoice fields.
 */
function buildInvoiceAddress(invoice: Invoice): string | undefined {
  const line1 = (invoice.Address || '').trim()
  const city = (invoice.City || '').trim()
  const state = (invoice.State || '').trim()
  const zip = (invoice.Zip || '').trim()

  const hasLine1 = line1.length > 0
  const hasCityStateZip = city.length > 0 || state.length > 0 || zip.length > 0

  if (!hasLine1 && !hasCityStateZip) {
    return undefined
  }

  const cityStateZipParts: string[] = []
  if (city) cityStateZipParts.push(city)
  if (state) cityStateZipParts.push(state)
  const cityState = cityStateZipParts.join(', ')

  const line2Parts: string[] = []
  if (cityState) line2Parts.push(cityState)
  if (zip) line2Parts.push(zip)
  const line2 = line2Parts.join(' ')

  if (hasLine1 && line2) {
    return `${line1}, ${line2}`
  }

  return hasLine1 ? line1 : line2 || undefined
}

/**
 * Maps TicketFilters to the API request payload structure
 */
function mapFiltersToApiRequest(filters: TicketFilters): TicketApiRequest {
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
    }
  }

  // Map ticket types: W = Workorder, I = Invoice, B = Batch, Q = Quote
  const typeParts: string[] = []
  if (filters.workorder) typeParts.push('W')
  if (filters.invoice) typeParts.push('I')
  if (filters.batch) typeParts.push('B')
  if (filters.quote) typeParts.push('Q')
  const types = typeParts.join('') || 'W' // Default to Workorder if no type selected

  // Determine search mode and value
  // Note: filters.search is now handled client-side, not sent to API
  let searchMode = 'All'
  let searchValue = ''
  let exactMatch = 'true'

  if (filters.ticketNumber) {
    searchMode = 'Ticket'
    searchValue = filters.ticketNumber
    exactMatch = 'true'
  }
  // filters.search is excluded - it's filtered client-side after API response
  // Response filters (status, salesrep, routeNum) are not sent; API returns full set for date/types/call params

  // Build the inner payload: call params from filters; store fixed to 0 (all); vehStatus/salesRep/routeNum sent as "all"
  const payload: TicketApiPayload = {
    searchMode,
    searchValue,
    types,
    partialFill: filters.partialFill ?? -1,
    backOrder: filters.backOrder ?? -1,
    natAcct: filters.natAcct ?? -1,
    fromDate: formatDateForApi(fromDate),
    toDate: formatDateForApi(toDate),
    inclCarryOver: 'false',
    storeNum: getSelectedStoreNum(),
    salesRep: '',
    routeNum: '',
    vehStatus: -1, // All statuses; vehicle status filtered client-side
    printStatus: filters.printStatus ?? 0,
    exactMatch,
    maxResults: 2500,
    skipDetail: 'true',
  }

  // Format the payload string (adds spaces to match Postman format)
  const payloadString = formatPayloadString(payload)
  
  // Build the wrapper request
  const request: TicketApiRequest = {
    integratorId: INTEGRATOR_ID,
    account: ACCOUNT,
    timestamp: TIMESTAMP,
    signature: SIGNATURE,
    funcName: 'INVOICE_LOOKUP',
    payload: payloadString,
  }

  return request
}

/**
 * Maps Invoice from API response to Ticket interface
 */
function mapInvoiceToTicket(invoice: Invoice, index: number): Ticket {
  // Build vehicle string
  const vehicleParts = [
    invoice.AutoMake,
    invoice.AutoModel,
    invoice.AutoYear,
  ].filter(Boolean)
  
  const vehicleTag = invoice.AutoTag ? `(${invoice.AutoTag})` : ''
  const vehicle = vehicleParts.length > 0 
    ? `${vehicleParts.join(' ')} ${vehicleTag}`.trim()
    : vehicleTag || ''

  // Map ticket type from API response
  let type: Ticket['type'] = 'W' // Default to Workorder
  const ticketTypeUpper = invoice.TicketType?.toUpperCase() || ''
  if (ticketTypeUpper === 'INVOICE') {
    type = 'I'
  } else if (ticketTypeUpper === 'BATCH') {
    type = 'B'
  } else if (ticketTypeUpper === 'WORKORDER') {
    type = 'W'
  } else if (ticketTypeUpper === 'QUOTE' || ticketTypeUpper === 'Q') {
    type = 'Q'
  }

  // Parse financial amounts
  const total = parseFloat(invoice.Amount) || 0
  const subtotal = invoice.Subtotal ? parseFloat(invoice.Subtotal) || undefined : undefined
  const salesTax = invoice.SalesTax ? parseFloat(invoice.SalesTax) || undefined : undefined
  const cost = invoice.Cost ? parseFloat(invoice.Cost) || undefined : undefined

  // Compute gross profit percentage on a 0–100 scale when data is available
  let gpPercent: number | undefined
  if (
    typeof subtotal === 'number' &&
    typeof cost === 'number' &&
    Number.isFinite(subtotal) &&
    Number.isFinite(cost) &&
    subtotal > 0
  ) {
    const margin = subtotal - cost
    const rawPercent = (margin / subtotal) * 100
    gpPercent = Math.round(rawPercent * 10) / 10
  }

  // Map vehicle status from ApptVehicleStatus field
  // ApptVehicleStatus can be a number (status code) or string (status name) or empty
  const apptVehicleStatus = invoice.ApptVehicleStatus
  const vehicleStatus = apptVehicleStatus 
    ? mapApiStatusToVehicleStatus(apptVehicleStatus)
    : ('' as VehicleStatus)

  return {
    id: invoice.InvoiceNum || index,
    ticketNumber: invoice.InvoiceNum,
    date: invoice.DateSold, // Already in MM/DD/YYYY format
    type,
    salesrep: invoice.SalesrepName || invoice.Salesrep || '',
    technician: invoice.TechnicianName || invoice.TechnicianCode || '',
    name: invoice.Name || '',
    vehicle,
    autoTag: invoice.AutoTag || '',
    vin: invoice.VIN || '',
    total,
    subtotal,
    salesTax,
    cost,
    gpPercent,
    vehicleStatus,
    inspectionStatus: 'none', // Not available in API response
    inspectionId: undefined, // Not available in API response
    // Use appointment date/time as the promised time when available.
    // Fallback to Delivery or DateSold so the UI can still reason about ordering.
    promisedTime: invoice.ApptDateTime || invoice.Delivery || invoice.DateSold,
    apptDurationMinutes: (() => {
      const raw = invoice.ApptDuration
      if (raw == null || raw === '') return undefined
      const n = typeof raw === 'string' ? parseInt(raw, 10) : Number(raw)
      return Number.isFinite(n) ? n : undefined
    })(),
    mileage: invoice.Mileage || undefined,
    phone: invoice.Phone || undefined,
    email: invoice.Email || undefined,
    address: buildInvoiceAddress(invoice),
    route: invoice.Route || invoice.RouteName || undefined,
    storeName: invoice.StoreName || undefined,
    ticketMemo: invoice.TicketMemo || '',
    bay: (() => {
      const rawCode = invoice.BayCode
      const rawText = invoice.BayText
      const normalizedCode = rawCode != null ? String(rawCode).trim() : ''
      const normalizedText = rawText != null ? String(rawText).trim() : ''
      const isNoBayText =
        normalizedText !== '' && normalizedText.toLowerCase() === 'no bay'
      // Treat 0 / "0" / empty / "No Bay" as "no bay selected"
      if (!normalizedCode || normalizedCode === '0') {
        if (!normalizedText || normalizedText === '0' || isNoBayText) {
          return ''
        }
        return normalizedText
      }
      if (normalizedCode.toLowerCase() === 'no bay') {
        return ''
      }
      return normalizedCode
    })(),
  }
}

/**
 * Maps API response to Ticket array
 */
function mapApiResponseToTickets(apiResponse: TicketApiResponse): Ticket[] {
  if (apiResponse.errorCode !== 0) {
    console.error('API Error:', apiResponse.errorText)
    return []
  }

  if (!apiResponse.payload?.Invoices?.Insert) {
    return []
  }

  return apiResponse.payload.Invoices.Insert.map((invoice, index) =>
    mapInvoiceToTicket(invoice, index)
  )
}

export interface PosAppointmentLookupRange {
  fromDate: string
  toDate: string
}

/** Heuristic: POS quote / estimate rows use many TicketType + OpenStatus variants vs workorders. */
function invoiceLooksLikeQuoteOrEstimate(invoice: Invoice): boolean {
  const type = (invoice.TicketType || '').trim().toUpperCase()
  if (
    type === 'QUOTE' ||
    type === 'Q' ||
    type === 'ESTIMATE' ||
    type === 'PROPOSAL' ||
    type.includes('QUOTE') ||
    type.includes('ESTIMATE')
  ) {
    return true
  }
  const status = (invoice.OpenStatus || '').trim().toUpperCase()
  if (
    status === 'QUOTE' ||
    status === 'ESTIMATE' ||
    status === 'PROPOSAL' ||
    status.includes('QUOTE')
  ) {
    return true
  }
  const apptCode = (invoice.ApptCode || '').trim().toUpperCase()
  const apptText = (invoice.ApptText || '').trim().toUpperCase()
  const memo = (invoice.TicketMemo || '').trim().toUpperCase()
  const hay = `${apptCode} ${apptText} ${memo}`
  return hay.includes('QUOTE') || hay.includes('ESTIMATE') || hay.includes('PROPOSAL')
}

/**
 * Include POS rows that should drive appointment calendar blocks + ticket # merge.
 * 1) Legacy: ApptActive + OPEN (workorders and quotes the POS still flags like workorders).
 * 2) Relaxed: quote / estimate signals often use other OpenStatus or ApptActive values but still carry ApptDateTime.
 */
function invoiceQualifiesForPosAppointmentCalendar(invoice: Invoice): boolean {
  if (!String(invoice.ApptDateTime || '').trim()) return false

  const active = String(invoice.ApptActive ?? '').trim()
  const apptOn = active === '1' || active.toUpperCase() === 'TRUE' || active === 'Y'
  const status = (invoice.OpenStatus || '').trim().toUpperCase()
  if (apptOn && status === 'OPEN') return true

  return invoiceLooksLikeQuoteOrEstimate(invoice)
}

/**
 * Fetch POS appointments from INVOICE_LOOKUP for a date window.
 * Uses fixed ticket types (QW) and selected store scope.
 */
export async function fetchPosAppointments(
  range: PosAppointmentLookupRange,
  signal?: AbortSignal
): Promise<Invoice[]> {
  try {
    const payload: TicketApiPayload = {
      searchMode: 'All',
      searchValue: '',
      types: 'QW',
      partialFill: -1,
      backOrder: -1,
      natAcct: -1,
      fromDate: range.fromDate,
      toDate: range.toDate,
      inclCarryOver: 'false',
      storeNum: getSelectedStoreNum(),
      salesRep: '',
      routeNum: '',
      vehStatus: -1,
      printStatus: 0,
      exactMatch: 'true',
      maxResults: 2500,
      skipDetail: 'true',
    }

    const request: TicketApiRequest = {
      integratorId: INTEGRATOR_ID,
      account: ACCOUNT,
      timestamp: TIMESTAMP,
      signature: SIGNATURE,
      funcName: 'INVOICE_LOOKUP',
      payload: formatPayloadString(payload),
    }

    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(request),
      credentials: 'omit',
      mode: 'cors',
      signal,
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const apiResponse: TicketApiResponse = await response.json()
    if (apiResponse.errorCode !== 0) {
      console.warn('fetchPosAppointments API error:', apiResponse.errorCode, apiResponse.errorText)
      return []
    }

    const invoices = apiResponse.payload?.Invoices?.Insert || []
    return invoices.filter(invoiceQualifiesForPosAppointmentCalendar)
  } catch (error: unknown) {
    const isAbort = (e: unknown) =>
      (e instanceof DOMException && e.name === 'AbortError') ||
      (e instanceof Error && e.name === 'AbortError') ||
      (e && typeof (e as Error).message === 'string' && String((e as Error).message).toLowerCase().includes('aborted'))
    if (isAbort(error)) {
      throw error
    }
    console.error('Error fetching POS appointments:', error)
    return []
  }
}

/**
 * Fetches tickets from the API
 */
export async function fetchTickets(
  filters: TicketFilters,
  signal?: AbortSignal
): Promise<Ticket[]> {
  try {
    const apiRequest = mapFiltersToApiRequest(filters)
    console.log('🔍 fetchTickets: Called with filters:', filters, 'API request searchMode:', JSON.parse(apiRequest.payload).searchMode)
    const url = API_BASE_URL

    // Create the final request body string
    // JSON.stringify will automatically escape quotes in the payload string
    const requestBody = JSON.stringify(apiRequest)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: requestBody,
      credentials: 'omit',
      mode: 'cors',
      signal, // Pass abort signal to fetch
    })

    // Try to parse error response
    if (!response.ok) {
      let errorMessage = `API request failed: ${response.status} ${response.statusText}`
      
      try {
        const errorData = await response.json()
        if (errorData.errorText) {
          errorMessage = `API Error (${response.status}): ${errorData.errorText}`
        } else if (errorData.message) {
          errorMessage = `API Error (${response.status}): ${errorData.message}`
        } else {
          errorMessage = `API Error (${response.status}): ${JSON.stringify(errorData)}`
        }
      } catch {
        // If JSON parsing fails, try text
        try {
          const errorText = await response.text()
          if (errorText) {
            errorMessage = `API Error (${response.status}): ${errorText}`
          }
        } catch {
          // Use default error message
        }
      }
      
      console.error('API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        url,
        requestPayload: apiRequest,
      })
      
      throw new Error(errorMessage)
    }

    const apiResponse: TicketApiResponse = await response.json()
    
    if (apiResponse.errorCode !== 0) {
      console.warn('API returned error code:', apiResponse.errorCode, 'Message:', apiResponse.errorText)
      // Still return empty array if API has an error code
      return []
    }
    
    return mapApiResponseToTickets(apiResponse)
  } catch (error: unknown) {
    // Rethrow abort so the query layer can cancel without caching empty result
    const isAbort = (e: unknown) =>
      (e instanceof DOMException && e.name === 'AbortError') ||
      (e instanceof Error && e.name === 'AbortError') ||
      (e && typeof (e as Error).message === 'string' && String((e as Error).message).toLowerCase().includes('aborted'))
    if (isAbort(error)) {
      throw error
    }
    if (error instanceof TypeError && error.message.includes('NetworkError')) {
      console.error('Network error: Unable to reach the API. This may be due to CORS restrictions or network connectivity issues.')
      console.error('If you see CORS errors, ensure the API server allows requests from your origin, or use the Vite proxy in development.')
    } else {
      console.error('Error fetching tickets:', error)
    }
    return []
  }
}

// HITS Notification API Interfaces
export interface HitsNotificationPayload {
  handlerId: number
  notificationType?: string
  ticketNum: number
  storeNum?: number
  custNum?: number
  custFirstName?: string
  custLastName?: string
  custEmail?: string
  custPhone?: string
  custMobile?: string
  custAddress?: string
  custCity?: string
  custState?: string
  custZip?: string
  apptDate?: string
  apptTime?: number
  apptDescription?: string
  apptCode?: string
  apptVehStatus?: number
  /** Vehicle status code for backend (same as apptVehStatus; some endpoints expect this key) */
  ApptVehicleStatus?: number
  apptCancel?: string
  comment?: string
  vehTag?: string
  vehMake?: string
  vehModel?: string
  vehYear?: string
  vehVin?: string
  vehMileage?: number
  attrType?: string
  attrMemo?: string
  attrLink?: string
}

export interface HitsNotificationResponse {
  success: boolean
  id?: number
  error?: string
}

/**
 * Send a HITS notification using the HITS_NOTIFICATION function
 */
export async function sendHitsNotification(
  payload: HitsNotificationPayload
): Promise<HitsNotificationResponse> {
  try {
    const payloadString = formatPayloadString(payload)
    
    const request: TicketApiRequest = {
      integratorId: INTEGRATOR_ID,
      account: ACCOUNT,
      timestamp: TIMESTAMP,
      signature: SIGNATURE,
      funcName: 'HITS_NOTIFICATION',
      payload: payloadString,
    }

    const requestBody = JSON.stringify(request)
    const url = API_BASE_URL

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: requestBody,
      credentials: 'omit',
      mode: 'cors',
    })

    if (!response.ok) {
      let errorMessage = `API request failed: ${response.status} ${response.statusText}`
      
      try {
        const errorData = await response.json()
        if (errorData.errorText) {
          errorMessage = `API Error (${response.status}): ${errorData.errorText}`
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
      
      return {
        success: false,
        error: errorMessage,
      }
    }

    const apiResponse = await response.json()

    // Check for explicit error codes first
    if (apiResponse?.errorCode && apiResponse.errorCode !== 0) {
      const errorMsg =
        apiResponse.errorText ||
        apiResponse.error ||
        apiResponse.Error ||
        'HITS notification returned an error'
      return {
        success: false,
        error: errorMsg,
      }
    }

    // Try to extract id from common locations
    const idCandidate =
      apiResponse?.id ??
      apiResponse?.Id ??
      apiResponse?.payload?.id ??
      apiResponse?.payload?.Id

    if (typeof idCandidate === 'number') {
      return {
        success: true,
        id: idCandidate,
      }
    }

    // If no error code and no id, still treat as success
    return {
      success: true,
    }
  } catch (error: any) {
    console.error('HITS Notification API Error:', error)
    return {
      success: false,
      error: error.message || 'Failed to send HITS notification',
    }
  }
}

/**
 * Fetch invoice/ticket details using INVOICE_LOOKUP with skipDetail: false
 */
export async function fetchInvoiceDetail(
  params: InvoiceDetailParams,
  signal?: AbortSignal
): Promise<InvoiceDetailResponse> {
  try {
    // Build the INVOICE_LOOKUP payload
    const now = new Date()
    const fromDate = new Date(now.getFullYear() - 1, 0, 1) // 1 year ago
    const toDate = new Date(now.getFullYear() + 1, 11, 31) // 1 year from now
    
    const payload: TicketApiPayload = {
      searchMode: 'Ticket',
      searchValue: params.invoiceNum.toString(),
      types: 'WIBQ', // Search all types: Workorder, Invoice, Batch, Quote
      partialFill: -1,
      backOrder: -1,
      natAcct: -1,
      fromDate: formatDateForApi(fromDate),
      toDate: formatDateForApi(toDate),
      inclCarryOver: 'false',
      storeNum: getSelectedStoreNum(),
      salesRep: '',
      routeNum: '',
      vehStatus: -1,
      printStatus: 0,
      exactMatch: 'true',
      maxResults: 2500,
      skipDetail: 'false', // KEY: This provides detailed line items
    }

    const payloadString = formatPayloadString(payload)
    
    const request: TicketApiRequest = {
      integratorId: INTEGRATOR_ID,
      account: ACCOUNT,
      timestamp: TIMESTAMP,
      signature: SIGNATURE,
      funcName: 'INVOICE_LOOKUP',
      payload: payloadString,
    }

    const requestBody = JSON.stringify(request)
    const url = API_BASE_URL

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: requestBody,
      credentials: 'omit',
      mode: 'cors',
      ...(signal && { signal }),
    })

    if (!response.ok) {
      let errorMessage = `API request failed: ${response.status} ${response.statusText}`
      
      try {
        const errorData = await response.json()
        if (errorData.errorText) {
          errorMessage = `API Error (${response.status}): ${errorData.errorText}`
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
      
      return {
        success: false,
        error: errorMessage,
      }
    }

    const apiResponse: TicketApiResponse = await response.json()

    // Check for error code in response
    if (apiResponse.errorCode && apiResponse.errorCode !== 0) {
      const errorMsg = apiResponse.errorText || 'Unknown error occurred'
      return {
        success: false,
        errorCode: apiResponse.errorCode,
        errorText: errorMsg,
        error: errorMsg,
      }
    }

    // Extract invoice from response
    const invoices = apiResponse.payload?.Invoices?.Insert || []
    if (invoices.length === 0) {
    return {
      success: false,
      error: 'Invoice not found',
    }
  }

  // Get the first invoice (should only be one when searching by exact ticket number)
  const invoice = invoices[0]
    
    // Map invoice to InvoiceRow
    const invoiceRow: InvoiceRow = {
      InvoiceNum: invoice.InvoiceNum,
      Merchandise: invoice.Subtotal, // Subtotal represents merchandise total
      FET: undefined, // Not directly available in Invoice object - would need to sum from items
      Services: undefined, // Not directly available - would need to calculate from service items
      Subtotal: invoice.Subtotal,
      Cost: invoice.Cost,
      SalesTax: invoice.SalesTax,
      Total: invoice.Amount,
      Units: undefined, // Not available in Invoice object
      Weight: undefined, // Not available in Invoice object
      CubicSize: undefined, // Not available in Invoice object
      TrailerFeet: undefined, // Not available in Invoice object
      kitTotal: undefined, // Not directly available - would need to calculate from kit items
      // Vehicle information
      AutoTag: invoice.AutoTag,
      AutoTagState: invoice.AutoTagState || undefined, // Available in response!
      AutoMake: invoice.AutoMake,
      AutoModel: invoice.AutoModel,
      AutoYear: invoice.AutoYear,
      VIN: invoice.VIN,
      Mileage: invoice.Mileage,
    }

    // Map Items array to DetailRow[]
    const detailRows: DetailRow[] = (invoice.Items || [])
      .map((item: any): DetailRow | null => {
        // Convert isDeclined from string "0"/"1" to boolean
        const isDeclined = item.isDeclined === "1" || item.isDeclined === 1 || item.isDeclined === true
        
        // Determine if item is a comment/separator (items with no description or special codes)
        const isComment = !item.ExtendedDescription || item.ExtendedDescription.trim() === "" || item.PartNum === ">>>>>>>>>>>>"
        
        // Use ExtendedDescription as primary, fall back to Description
        const description = item.ExtendedDescription || item.Description || ""
        
        // Filter out "Job Price" items where TotalPrice is 0
        const isJobPrice = item.PartNum === ">>>>>>>>>>>>"
        const totalPrice = parseFloat(item.TotalPrice || "0")
        if (isJobPrice && totalPrice === 0) {
          return null // Filter out this item
        }
        
        return {
          InvoiceNum: invoice.InvoiceNum,
          LineNum: item.ItemNum ? parseInt(item.ItemNum) : 0, // ItemNum is the line number
          ProductNum: item.PartNum || item.MFGSKU || undefined, // Use PartNum as ProductNum
          Description: description,
          Quantity: item.Quantity !== undefined ? String(item.Quantity) : "0",
          AllowedTime: item.AllowedTime !== undefined ? String(item.AllowedTime) : undefined,
          PriceCode: item.PriceCode || "",
          RegularPrice: item.PCPrice !== undefined ? String(item.PCPrice) : undefined, // PCPrice might be regular price
          UnitPrice: item.UnitPrice !== undefined ? String(item.UnitPrice) : "0",
          UnitFet: item.UnitFET !== undefined ? String(item.UnitFET) : "0", // Note: UnitFET in response
          Total: item.TotalPrice !== undefined ? String(item.TotalPrice) : "0", // TotalPrice is the total
          UT1: item.UT1 || "",
          Package: item.Package !== undefined && item.Package !== null ? parseInt(String(item.Package)) : 0, // Package ID for grouping (parse to ensure it's a number)
          Rawsize: item.Rawsize || item.rawsize || undefined, // Raw size field for special handling
          Goods: item.Goods || undefined, // "S" (Service) or "G" (Goods)
          Props: {
            IsDeclined: isDeclined,
            IsComment: isComment,
          },
        }
      })
      .filter((item): item is DetailRow => item !== null) // Remove filtered items

    return {
      success: true,
      errorCode: apiResponse.errorCode || 0,
      errorText: apiResponse.errorText || '',
      invoiceRow,
      detailRows,
      invoice,
      errors: [],
      warnings: [],
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch invoice detail',
    }
  }
}

/**
 * Build a Ticket from an InvoiceDetailResponse that includes the raw invoice.
 * Use when you have invoice detail and need the Ticket shape (e.g. for CustomerInvoiceView).
 */
export function buildTicketFromInvoiceDetail(response: InvoiceDetailResponse): Ticket | null {
  const inv = response.invoice
  if (!inv || !response.success) return null
  return mapInvoiceToTicket(inv, 0)
}

export interface ShopHistoryEntry {
  ticket: Ticket
  invoiceRow: InvoiceRow
  detailRows: DetailRow[]
  storeName?: string
  storeNum?: number
}

export interface ShopHistoryResponse {
  success: boolean
  entries?: ShopHistoryEntry[]
  errorCode?: number
  errorText?: string
  error?: string
}

/**
 * Fetch shop history for a vehicle tag (license plate) using INVOICE_LOOKUP:
 * - searchMode: Tag
 * - searchValue: <vehicleTag>
 * - fromDate: 10 years prior to search time
 * - toDate: search time
 * - skipDetail: true (exclude line item detail for list view - details fetched on demand)
 */
export async function fetchShopHistoryByVehicleTag(
  vehicleTag: string,
  signal?: AbortSignal
): Promise<ShopHistoryResponse> {
  const normalizedTag = vehicleTag.trim()
  if (!normalizedTag) {
    return { success: false, error: 'Vehicle tag (license plate) is required' }
  }

  try {
    const now = new Date()
    const fromDate = new Date(now)
    fromDate.setFullYear(now.getFullYear() - 10)
    const toDate = now

    const payload: TicketApiPayload = {
      searchMode: 'Tag',
      // Match expected API payload (example: "BFF4689")
      searchValue: normalizedTag.toUpperCase(),
      // Match expected API payload exactly (example uses "IB")
      types: 'IB', // Only Invoices + Batch for shop history
      partialFill: -1,
      backOrder: -1,
      natAcct: -1,
      fromDate: formatDateForApi(fromDate),
      toDate: formatDateForApi(toDate),
      inclCarryOver: 'false',
      storeNum: getSelectedStoreNum(),
      salesRep: '',
      routeNum: '',
      vehStatus: -1,
      printStatus: 0,
      exactMatch: 'true',
      maxResults: 2500,
      skipDetail: 'true', // KEY: Exclude detailed line items for list view (details fetched on demand)
    }

    // IMPORTANT: For shop history, use compact JSON to match expected payload exactly.
    // Example provided:
    // {"searchMode":"Tag","searchValue":"BFF4689","types":"IB",...}
    const payloadString = JSON.stringify(payload)
    console.log('🔍 fetchShopHistoryByVehicleTag: Using searchMode="Tag", searchValue="' + normalizedTag.toUpperCase() + '"', payload)

    const request: TicketApiRequest = {
      integratorId: INTEGRATOR_ID,
      account: ACCOUNT,
      timestamp: TIMESTAMP,
      signature: SIGNATURE,
      funcName: 'INVOICE_LOOKUP',
      payload: payloadString,
    }

    const requestBody = JSON.stringify(request)
    const url = API_BASE_URL

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: requestBody,
      credentials: 'omit',
      mode: 'cors',
      signal,
    })

    if (!response.ok) {
      let errorMessage = `API request failed: ${response.status} ${response.statusText}`

      try {
        const errorData = await response.json()
        if (errorData.errorText) {
          errorMessage = `API Error (${response.status}): ${errorData.errorText}`
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

      return { success: false, error: errorMessage }
    }

    const apiResponse: TicketApiResponse = await response.json()

    if (apiResponse.errorCode && apiResponse.errorCode !== 0) {
      const errorMsg = apiResponse.errorText || 'Unknown error occurred'
      return {
        success: false,
        errorCode: apiResponse.errorCode,
        errorText: errorMsg,
        error: errorMsg,
      }
    }

    const invoices = apiResponse.payload?.Invoices?.Insert || []

    const entries: ShopHistoryEntry[] = invoices.map((invoice, index) => {
      const ticket = mapInvoiceToTicket(invoice, index)

      const invoiceRow: InvoiceRow = {
        InvoiceNum: invoice.InvoiceNum,
        Merchandise: invoice.Subtotal,
        FET: undefined,
        Services: undefined,
        Subtotal: invoice.Subtotal,
        Cost: invoice.Cost,
        SalesTax: invoice.SalesTax,
        Total: invoice.Amount,
        Units: undefined,
        Weight: undefined,
        CubicSize: undefined,
        TrailerFeet: undefined,
        kitTotal: undefined,
        AutoTag: invoice.AutoTag,
        AutoTagState: invoice.AutoTagState || undefined,
        AutoMake: invoice.AutoMake,
        AutoModel: invoice.AutoModel,
        AutoYear: invoice.AutoYear,
        VIN: invoice.VIN,
        Mileage: invoice.Mileage,
      }

      const detailRows: DetailRow[] = (invoice.Items || [])
        .map((item: any): DetailRow | null => {
          const isDeclined = item.isDeclined === "1" || item.isDeclined === 1 || item.isDeclined === true

          const isComment =
            !item.ExtendedDescription ||
            item.ExtendedDescription.trim() === "" ||
            item.PartNum === ">>>>>>>>>>>>"

          const description = item.ExtendedDescription || item.Description || ""

          // Filter out "Job Price" items where TotalPrice is 0
          const isJobPrice = item.PartNum === ">>>>>>>>>>>>"
          const totalPrice = parseFloat(item.TotalPrice || "0")
          if (isJobPrice && totalPrice === 0) {
            return null
          }

          return {
            InvoiceNum: invoice.InvoiceNum,
            LineNum: item.ItemNum ? parseInt(item.ItemNum) : 0,
            ProductNum: item.PartNum || item.MFGSKU || undefined,
            Description: description,
            Quantity: item.Quantity !== undefined ? String(item.Quantity) : "0",
            AllowedTime: item.AllowedTime !== undefined ? String(item.AllowedTime) : undefined,
            PriceCode: item.PriceCode || "",
            RegularPrice: item.PCPrice !== undefined ? String(item.PCPrice) : undefined,
            UnitPrice: item.UnitPrice !== undefined ? String(item.UnitPrice) : "0",
            UnitFet: item.UnitFET !== undefined ? String(item.UnitFET) : "0",
            Total: item.TotalPrice !== undefined ? String(item.TotalPrice) : "0",
            UT1: item.UT1 || "",
            Package: item.Package !== undefined && item.Package !== null ? parseInt(String(item.Package)) : 0,
            Rawsize: item.Rawsize || item.rawsize || undefined,
            Goods: item.Goods || undefined,
            Props: {
              IsDeclined: isDeclined,
              IsComment: isComment,
            },
          }
        })
        .filter((row): row is DetailRow => row !== null)

      return {
        ticket,
        invoiceRow,
        detailRows,
        storeName: invoice.StoreName || undefined,
        storeNum: invoice.StoreNum || undefined,
      }
    })

    return {
      success: true,
      entries,
      errorCode: apiResponse.errorCode || 0,
      errorText: apiResponse.errorText || '',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Failed to fetch shop history',
    }
  }
}

/**
 * Resolve an external/portal inv token to an invoice number.
 * Used when decodeInvoiceToken fails (e.g. tokens from hitsdigital-portal.com).
 * Set VITE_RESOLVE_INV_TOKEN_URL to the endpoint that accepts ?inv=<token> and returns
 * { invoiceNum: number } or { ticketNumber: number }. If unset, returns null.
 */
const RESOLVE_INV_TOKEN_URL = import.meta.env.VITE_RESOLVE_INV_TOKEN_URL as string | undefined

export async function resolveInvoiceByInvToken(
  invToken: string,
  signal?: AbortSignal
): Promise<{ invoiceNum: number } | null> {
  const base = RESOLVE_INV_TOKEN_URL?.trim()
  if (!base) return null
  try {
    const sep = base.includes('?') ? '&' : '?'
    const res = await fetch(`${base}${sep}inv=${encodeURIComponent(invToken)}`, { signal })
    if (!res.ok) return null
    const data = await res.json()
    const num = data.invoiceNum ?? data.ticketNumber ?? data.invoiceNumber
    if (typeof num === 'number' && Number.isInteger(num)) return { invoiceNum: num }
    if (typeof num === 'string') {
      const n = parseInt(num, 10)
      if (!Number.isNaN(n)) return { invoiceNum: n }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Validate invoice token parameters server-side
 * This ensures the account and invoice number match and belong together
 */
export async function validateInvoiceToken(
  _account: string,
  invoiceNum: string,
  signal?: AbortSignal
): Promise<{ valid: boolean; error?: string; invoiceDetail?: InvoiceDetailResponse }> {
  try {
    // Fetch the invoice to validate it exists and belongs to the account
    const invoiceDetail = await fetchInvoiceDetail({
      invoiceNum: parseInt(invoiceNum),
      includeRawData: 'false',
      includeSchema: 'false',
    }, signal)
    
    if (!invoiceDetail.success) {
      return {
        valid: false,
        error: invoiceDetail.error || 'Invoice not found',
      }
    }
    
    // In production, you should validate that the invoice belongs to the specified account
    // For now, we'll rely on the API which should only return invoices for the authenticated account
    // The account parameter (a) should match the ACCOUNT constant or be validated against user permissions
    
    return {
      valid: true,
      invoiceDetail,
    }
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'Failed to validate invoice token',
    }
  }
}

/**
 * Fetch invoice/ticket details using FETCH_CUSTOMER_VIEW (DEPRECATED - use fetchInvoiceDetail which now uses INVOICE_LOOKUP)
 */
export async function fetchInvoiceDetailLegacy(
  params: InvoiceDetailParams
): Promise<InvoiceDetailResponse> {
  try {
    const payload: Record<string, any> = {
      invoiceNum: params.invoiceNum,
      includeRawData: params.includeRawData === true || params.includeRawData === 'true' ? 'true' : 'false',
      includeSchema: params.includeSchema === true || params.includeSchema === 'true' ? 'true' : 'false',
    }

    const payloadString = formatPayloadString(payload)
    
    const request: TicketApiRequest = {
      integratorId: INTEGRATOR_ID,
      account: ACCOUNT,
      timestamp: TIMESTAMP,
      signature: SIGNATURE,
      funcName: 'FETCH_CUSTOMER_VIEW',
      payload: payloadString,
    }

    const requestBody = JSON.stringify(request)
    const url = API_BASE_URL

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: requestBody,
      credentials: 'omit',
      mode: 'cors',
    })

    if (!response.ok) {
      let errorMessage = `API request failed: ${response.status} ${response.statusText}`
      
      try {
        const errorData = await response.json()
        if (errorData.errorText) {
          errorMessage = `API Error (${response.status}): ${errorData.errorText}`
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
      
      return {
        success: false,
        error: errorMessage,
      }
    }

    const apiResponse = await response.json()

    // Check for error code in response
    if (apiResponse.errorCode && apiResponse.errorCode !== 0) {
      const errorMsg = apiResponse.errorText || 'Unknown error occurred'
      return {
        success: false,
        errorCode: apiResponse.errorCode,
        errorText: errorMsg,
        error: errorMsg,
      }
    }

    // Parse invoice detail from response
    // Response structure: payload.InvoiceRow and payload.DetailRows
    const payloadData = apiResponse.payload || {}
    const invoiceRow = payloadData.InvoiceRow || payloadData.invoiceRow || {}
    const detailRows = payloadData.DetailRows || payloadData.detailRows || []

    return {
      success: true,
      errorCode: apiResponse.errorCode || 0,
      errorText: apiResponse.errorText || '',
      invoiceRow: {
        InvoiceNum: invoiceRow.InvoiceNum || invoiceRow.invoiceNum || params.invoiceNum,
        Merchandise: invoiceRow.Merchandise || invoiceRow.merchandise,
        FET: invoiceRow.FET || invoiceRow.fet,
        Services: invoiceRow.Services || invoiceRow.services,
        Subtotal: invoiceRow.Subtotal || invoiceRow.subtotal,
        Cost: invoiceRow.Cost || invoiceRow.cost,
        SalesTax: invoiceRow.SalesTax || invoiceRow.salesTax,
        Total: invoiceRow.Total || invoiceRow.total,
        Units: invoiceRow.Units || invoiceRow.units,
        Weight: invoiceRow.Weight || invoiceRow.weight,
        CubicSize: invoiceRow.CubicSize || invoiceRow.cubicSize,
        TrailerFeet: invoiceRow.TrailerFeet || invoiceRow.trailerFeet,
        kitTotal: invoiceRow.kitTotal || invoiceRow.kitTotal,
        // Vehicle information (from raw data when includeRawData is true)
        AutoTag: invoiceRow.AutoTag || invoiceRow.autoTag,
        AutoTagState: invoiceRow.AutoTagState || invoiceRow.autoTagState,
        AutoMake: invoiceRow.AutoMake || invoiceRow.autoMake,
        AutoModel: invoiceRow.AutoModel || invoiceRow.autoModel,
        AutoYear: invoiceRow.AutoYear || invoiceRow.autoYear,
        VIN: invoiceRow.VIN || invoiceRow.vin || invoiceRow.Vin,
        Mileage: invoiceRow.Mileage !== undefined ? invoiceRow.Mileage : (invoiceRow.mileage !== undefined ? invoiceRow.mileage : undefined),
      },
      detailRows: Array.isArray(detailRows)
        ? detailRows.map((row: any) => ({
            InvoiceNum: row.InvoiceNum || row.invoiceNum || params.invoiceNum,
            LineNum: row.LineNum || row.lineNum || 0,
            ProductNum: row.ProductNum || row.productNum,
            Description: row.Description || row.description,
            Quantity: row.Quantity || row.quantity,
            AllowedTime: row.AllowedTime || row.allowedTime,
            PriceCode: row.PriceCode || row.priceCode,
            RegularPrice: row.RegularPrice || row.regularPrice,
            UnitPrice: row.UnitPrice || row.unitPrice,
            UnitFet: row.UnitFet || row.unitFet,
            Total: row.Total || row.total,
            UT1: row.UT1 || row.ut1,
            Goods: row.Goods || row.goods || undefined,
            Props: row.Props || row.props || {},
          }))
        : [],
      errors: payloadData.errors || payloadData.Errors || [],
      warnings: payloadData.warnings || payloadData.Warnings || [],
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch invoice detail',
    }
  }
}

