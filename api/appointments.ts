import { fetchPosAppointments, sendHitsNotification, type HitsNotificationPayload } from './tickets'
import { buildSendEmailRequest, sendChatMessage, sendEmail } from './chat'
import { HITS_ACCOUNT } from '@/config/hitsAccount'
import { getSelectedStoreNum } from '@/composables/useStoreContext'
import type {
  AppointmentBlockColorKey,
  AppointmentColorScopeType,
  AppointmentFilters,
  AppointmentListResult,
  AppointmentRecord,
  AppointmentRecordType,
  AppointmentSortBy,
  AppointmentStatus,
  ICalSyncInfo,
  ScheduleNoteBlockerType,
} from '@/types/appointment'
import type { Invoice } from '@/types/ticket'
import { STATIC_BAY_CONFIG } from '@/config/bays'
import { addMinutes, dateAtTime, isWithinRange, toMinutes } from '@/lib/appointments/time'
import {
  reconcileBayBlockersAgainstShopCloses,
  reconcileBayBlockersForDate,
} from '@/lib/appointments/shopClosePrecedence'

/**
 * Appointment payload structure for sending appointments to point of sale
 * Payload details will be provided by user later
 */
export interface AppointmentPayload {
  handlerId: number
  notificationType?: string
  ticketNum?: number
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
  apptDate?: string // MM/DD/YYYY format
  apptTime?: number // Time in minutes from midnight, or other format as specified
  apptDescription?: string
  apptCode?: string
  apptVehStatus?: number
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

export interface AppointmentResponse {
  success: boolean
  id?: number
  error?: string
}

export type BookingSource = 'book' | 'widget'

export interface BookingAppointmentData {
  service: { id: string; name: string; duration: number } | null
  serviceDescription?: string
  date: string
  time: string
  isDropoff: boolean
  needsRide?: boolean
  issueTypeAnswer?: string
  followupAnswers?: Record<string, string>
  uploadedAttachments?: Array<{ mediaUrl: string; filename: string }>
  additionalServices?: string[]
  customer: {
    name: string
    custNum?: number
    custFirstName?: string
    custLastName?: string
    phone?: string
    email?: string
    address?: {
      street?: string
      apt?: string
      city?: string
      state?: string
      zip?: string
    }
    vehicle?: {
      licensePlate?: string
      state?: string
      year?: string
      make?: string
      model?: string
      vin?: string
      mileage?: string
    }
  }
}

export interface SendAppointmentOptions {
  source?: BookingSource
}

/**
 * Appointment request that needs approval
 */
export interface AppointmentRequest {
  id: number
  custNum?: number
  custFirstName: string
  custLastName: string
  custEmail?: string
  custPhone?: string
  custMobile?: string
  custAddress?: string
  custCity?: string
  custState?: string
  custZip?: string
  apptDate: string // MM/DD/YYYY format
  apptTime: number // Time in minutes from midnight (HHMM format)
  apptDescription: string // Service/reason for repair
  apptCode?: string
  comment?: string // Additional notes/description
  vehTag?: string // License plate
  vehMake?: string
  vehModel?: string
  vehYear?: string
  vehVin?: string
  vehMileage?: number
  status: 'pending' | 'approved' | 'declined'
  createdAt?: string
}

export interface AppointmentRequestFilters {
  dateRange?: string
  customFromDate?: string // MM/DD/YYYY format
  customToDate?: string // MM/DD/YYYY format
  status?: string // 'pending' | 'approved' | 'declined' | 'All Statuses'
}

/**
 * Formats a date string (YYYY-MM-DD) to MM/DD/YYYY format for API
 */
function formatDateForApi(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00') // Add time to avoid timezone issues
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  return `${month}/${day}/${year}`
}

/**
 * Converts time string (HH:MM or "AM dropoff") to 24-hour format (HHMM as number)
 * Returns 600 (6:00 AM) for "AM dropoff" or the time in 24-hour format (e.g., 4PM = 1600, 7AM = 700)
 */
function convertTimeTo24Hour(time: string): number {
  if (time === 'am-dropoff' || time.toLowerCase() === 'am dropoff') {
    return 600 // AM dropoff - set to 6:00 AM (0600)
  }
  
  // Parse HH:MM format (already in 24-hour format)
  const [hours, minutes] = time.split(':').map(Number)
  if (isNaN(hours) || isNaN(minutes)) {
    return 0
  }
  
  // Convert to HHMM format (e.g., 16:00 = 1600, 7:00 = 700)
  return hours * 100 + minutes
}

/**
 * Strips formatting from phone number, returning only digits
 * Example: "(555) 123-4567" -> "5551234567"
 */
function stripPhoneFormatting(phone: string | undefined): string {
  if (!phone) return ''
  // Remove all non-digit characters
  return phone.replace(/\D/g, '')
}

/**
 * Builds appointment payload from appointment data
 */
export function buildAppointmentPayload(appointmentData: BookingAppointmentData): HitsNotificationPayload {
  // Parse firstName/lastName from customer name
  const nameParts = appointmentData.customer.name?.split(' ') || []
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''

  // Build service description from service name and additional services (NOT including "Other" description)
  const services = []
  if (appointmentData.service && appointmentData.service.id !== 'other') {
    services.push(appointmentData.service.name)
  }
  if (appointmentData.additionalServices && appointmentData.additionalServices.length > 0) {
    services.push(...appointmentData.additionalServices)
  }
  const apptDescription = services.join(', ')

  // Build address string
  const addressParts = []
  if (appointmentData.customer.address?.street) {
    addressParts.push(appointmentData.customer.address.street)
  }
  if (appointmentData.customer.address?.apt) {
    addressParts.push(appointmentData.customer.address.apt)
  }
  const address = addressParts.join(', ')

  // Convert time to 24-hour format (HHMM as number)
  const apptTime = convertTimeTo24Hour(appointmentData.time)

  // Build comment - "Other" service description goes here
  const comment = appointmentData.serviceDescription || ''

  // Determine custNum: undefined if customer not found (0 or undefined), otherwise use the value
  const custNum = appointmentData.customer.custNum && appointmentData.customer.custNum > 0 
    ? appointmentData.customer.custNum 
    : undefined

  // Determine vehMileage: undefined if not entered, otherwise parse the value
  let vehMileage: number | undefined
  if (appointmentData.customer.vehicle?.mileage) {
    const parsed = parseInt(appointmentData.customer.vehicle.mileage.replace(/[^0-9]/g, ''))
    if (parsed > 0) {
      vehMileage = parsed
    }
  }

  // Build the payload
  const payload: HitsNotificationPayload = {
    handlerId: 1,
    notificationType: 'Online Appointment',
    ticketNum: 0, // Appointments don't have ticket numbers initially
    storeNum: getSelectedStoreNum(),
    custNum: custNum,
    custFirstName: firstName,
    custLastName: lastName,
    custEmail: appointmentData.customer.email || '',
    custPhone: stripPhoneFormatting(appointmentData.customer.phone),
    custMobile: stripPhoneFormatting(appointmentData.customer.phone), // Use phone as mobile if no separate mobile
    custAddress: address,
    custCity: appointmentData.customer.address?.city || '',
    custState: appointmentData.customer.address?.state || '',
    custZip: appointmentData.customer.address?.zip || '',
    apptDate: formatDateForApi(appointmentData.date),
    apptTime: apptTime,
    apptDescription: apptDescription,
    apptCode: appointmentData.time === 'am-dropoff' ? 'AM_DROPOFF' : '',
    apptVehStatus: 65,
    apptCancel: '',
    comment: comment,
    vehTag: appointmentData.customer.vehicle?.licensePlate || '', // License plate number
    vehMake: appointmentData.customer.vehicle?.make || '', // Vehicle make
    vehModel: appointmentData.customer.vehicle?.model || '', // Vehicle model
    vehYear: appointmentData.customer.vehicle?.year || '', // Vehicle year
    vehVin: appointmentData.customer.vehicle?.vin || '', // VIN
    vehMileage: vehMileage,
    attrType: '',
    attrMemo: '',
    attrLink: '',
  }

  return payload
}

function getRequestedTimeForModuleRecord(time: string): string {
  return time === 'am-dropoff' || time.toLowerCase() === 'am dropoff' ? '07:00' : time
}

function parseOptionalPositiveNumber(value: string | number | null | undefined): number | undefined {
  const parsed = typeof value === 'number' ? value : Number(String(value || '').trim())
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined
  }
  return Math.floor(parsed)
}

function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isValidRequestedTime(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value)
}

function getRecordCustomerNameParts(record: AppointmentRecord): { firstName: string; lastName: string } {
  const parts = (record.customerName || '').trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  }
}

function buildAppointmentPayloadFromRecord(record: AppointmentRecord): HitsNotificationPayload {
  const { firstName, lastName } = getRecordCustomerNameParts(record)
  const storeNum = parseOptionalPositiveNumber(record.storeId) ?? getSelectedStoreNum()
  const custNum = parseOptionalPositiveNumber(record.customerId)
  const vehMileage = parseOptionalPositiveNumber(record.vehicle?.mileage)

  return {
    handlerId: 1,
    notificationType: 'Online Appointment',
    ticketNum: 0,
    storeNum,
    custNum,
    custFirstName: firstName,
    custLastName: lastName,
    custEmail: record.customerEmail || '',
    custPhone: stripPhoneFormatting(record.customerPhone),
    custMobile: stripPhoneFormatting(record.customerPhone),
    custAddress: '',
    custCity: '',
    custState: '',
    custZip: '',
    apptDate: formatDateForApi(record.requestedDate),
    apptTime: convertTimeTo24Hour(record.requestedTime),
    apptDescription: (record.note || '').trim(),
    apptCode: '',
    apptVehStatus: 65,
    apptCancel: '',
    comment: (record.note || '').trim(),
    vehTag: record.vehicle?.licensePlate || '',
    vehMake: record.vehicle?.make || '',
    vehModel: record.vehicle?.model || '',
    vehYear: record.vehicle?.year || '',
    vehVin: record.vehicle?.vin || '',
    vehMileage,
    attrType: '',
    attrMemo: '',
    attrLink: '',
  }
}

function canSendAppointmentNotification(record: AppointmentRecord): boolean {
  if (!isAppointmentRecordType(record.recordType)) return false
  if ((record.customerName || '').trim().length === 0) return false
  if (!isValidIsoDate(record.requestedDate)) return false
  if (!isValidRequestedTime(record.requestedTime)) return false
  return true
}

async function sendAppointmentNotificationForRecord(record: AppointmentRecord): Promise<boolean> {
  try {
    const payload = buildAppointmentPayloadFromRecord(record)
    const result = await sendHitsNotification(payload)
    if (!result.success) {
      console.error('Failed to send appointment notification for scheduler record:', result.error, record.id)
      return false
    }
    return true
  } catch (error) {
    console.error('Error sending appointment notification for scheduler record:', error, record.id)
    return false
  }
}

function markRecordApiSubmitted(records: AppointmentRecord[], id: string): AppointmentRecord[] {
  return records.map((item) => (item.id === id ? { ...item, apiSubmitted: true, updatedAt: new Date().toISOString() } : item))
}

function buildBookingRecordNote(appointmentData: BookingAppointmentData): string | undefined {
  const serviceNames = [
    appointmentData.service?.name || '',
    ...(appointmentData.additionalServices || []),
  ]
    .map((value) => value.trim())
    .filter(Boolean)
  const serviceSummary = serviceNames.join(', ')
  const description = (appointmentData.serviceDescription || '').trim()

  const extraLines: string[] = []
  if (typeof appointmentData.needsRide === 'boolean') {
    extraLines.push(`Ride needed: ${appointmentData.needsRide ? 'Yes' : 'No'}`)
  }
  if (appointmentData.uploadedAttachments && appointmentData.uploadedAttachments.length > 0) {
    extraLines.push(
      `Attachments: ${appointmentData.uploadedAttachments
        .map((item) => `${item.filename} (${item.mediaUrl})`)
        .join('; ')}`
    )
  }
  const extras = extraLines.join('\n')

  if (serviceSummary && description && extras) {
    return `${serviceSummary}\n${description}\n${extras}`
  }
  if (serviceSummary && description) {
    return `${serviceSummary}\n${description}`
  }
  if (description && extras) {
    return `${description}\n${extras}`
  }
  if (serviceSummary) {
    return serviceSummary
  }
  if (description) {
    return extras ? `${description}\n${extras}` : description
  }
  return extras || undefined
}

function getBookingCustomerName(customer: BookingAppointmentData['customer']): string {
  const fullName = (customer.name || '').trim()
  if (fullName) {
    return fullName
  }
  const fallbackName = `${customer.custFirstName || ''} ${customer.custLastName || ''}`.trim()
  return fallbackName || 'Customer'
}

export function mapBookingPayloadToUnconfirmedRecord(
  appointmentData: BookingAppointmentData,
  source: BookingSource = 'book'
): Omit<AppointmentRecord, 'id' | 'createdAt' | 'updatedAt'> {
  const customer = appointmentData.customer
  return {
    accountId: HITS_ACCOUNT,
    storeId: String(getSelectedStoreNum()),
    customerName: getBookingCustomerName(customer),
    customerPhone: customer.phone || undefined,
    customerEmail: customer.email || undefined,
    sendText: Boolean(customer.phone),
    sendEmail: Boolean(customer.email),
    recordType: 'booked_unconfirmed',
    status: 'unconfirmed',
    requestedDate: appointmentData.date,
    requestedTime: getRequestedTimeForModuleRecord(appointmentData.time),
    requestedDuration: appointmentData.service?.duration || 60,
    bayId: 'NB',
    bayName: 'No Bay',
    note: buildBookingRecordNote(appointmentData),
    createdBy: source === 'widget' ? 'Widget' : 'Book',
    posFlag: false,
    apiSubmitted: true,
    vehicle: customer.vehicle
      ? {
          year: customer.vehicle.year || undefined,
          make: customer.vehicle.make || undefined,
          model: customer.vehicle.model || undefined,
          vin: customer.vehicle.vin || undefined,
          licensePlate: customer.vehicle.licensePlate || undefined,
          tagState: customer.vehicle.state || undefined,
        }
      : undefined,
  }
}

/**
 * Sends an appointment to the point of sale system
 */
export async function sendAppointment(
  appointmentData: BookingAppointmentData,
  options: SendAppointmentOptions = {}
): Promise<AppointmentResponse> {
  const source = options.source || 'book'
  try {
    try {
      await createAppointmentRecord(mapBookingPayloadToUnconfirmedRecord(appointmentData, source), { syncIcal: true })
    } catch (recordError) {
      console.error('Error saving booking record to module storage:', recordError)
    }

    const payload = buildAppointmentPayload(appointmentData)
    const result = await sendHitsNotification(payload)
    
    // Save appointment to localStorage for dashboard display (regardless of API success)
    // This ensures all appointments appear on the dashboard even if API call fails
    const appointmentRequest = convertToAppointmentRequest(appointmentData)
    saveAppointmentRequest(appointmentRequest)
    
    return {
      success: result.success,
      id: result.id,
      error: result.error,
    }
  } catch (error: any) {
    console.error('Error sending appointment:', error)
    
    // Still save appointment to localStorage even if API call throws an error
    try {
      const appointmentRequest = convertToAppointmentRequest(appointmentData)
      saveAppointmentRequest(appointmentRequest)
    } catch (saveError) {
      console.error('Error saving appointment to localStorage:', saveError)
    }
    
    return {
      success: false,
      error: error.message || 'Failed to send appointment',
    }
  }
}

/**
 * Storage key for appointments in localStorage
 */
const APPOINTMENTS_STORAGE_KEY = 'appointment_requests'

/**
 * Gets the next appointment ID (increments from highest existing ID)
 */
function getNextAppointmentId(): number {
  const stored = localStorage.getItem(APPOINTMENTS_STORAGE_KEY)
  if (!stored) return 1
  
  try {
    const appointments: AppointmentRequest[] = JSON.parse(stored)
    if (appointments.length === 0) return 1
    const maxId = Math.max(...appointments.map(a => a.id))
    return maxId + 1
  } catch {
    return 1
  }
}

/**
 * Saves an appointment request to localStorage
 */
export function saveAppointmentRequest(appointment: AppointmentRequest): void {
  try {
    const stored = localStorage.getItem(APPOINTMENTS_STORAGE_KEY)
    const appointments: AppointmentRequest[] = stored ? JSON.parse(stored) : []
    appointments.push(appointment)
    localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments))
    console.log('Appointment saved to dashboard:', appointment.id, appointment.apptDate, appointment.custFirstName, appointment.custLastName)
  } catch (error) {
    console.error('Error saving appointment request:', error)
  }
}

/**
 * Converts appointment booking data to AppointmentRequest format
 */
export function convertToAppointmentRequest(
  appointmentData: BookingAppointmentData
): AppointmentRequest {
  const nameParts = appointmentData.customer.name?.split(' ') || []
  const firstName = appointmentData.customer.custFirstName || nameParts[0] || ''
  const lastName = appointmentData.customer.custLastName || nameParts.slice(1).join(' ') || ''

  // Build service description
  const services = []
  if (appointmentData.service && appointmentData.service.id !== 'other') {
    services.push(appointmentData.service.name)
  }
  if (appointmentData.additionalServices && appointmentData.additionalServices.length > 0) {
    services.push(...appointmentData.additionalServices)
  }
  const apptDescription = services.join(', ')

  // Build address string
  const addressParts = []
  if (appointmentData.customer.address?.street) {
    addressParts.push(appointmentData.customer.address.street)
  }
  if (appointmentData.customer.address?.apt) {
    addressParts.push(appointmentData.customer.address.apt)
  }
  const address = addressParts.join(', ')

  // Convert time
  const apptTime = convertTimeTo24Hour(appointmentData.time)

  return {
    id: getNextAppointmentId(),
    custNum: appointmentData.customer.custNum ?? 0, // Use 0 if custNum is null or undefined (for dashboard display)
    custFirstName: firstName,
    custLastName: lastName,
    custEmail: appointmentData.customer.email || '',
    custPhone: stripPhoneFormatting(appointmentData.customer.phone),
    custMobile: stripPhoneFormatting(appointmentData.customer.phone),
    custAddress: address,
    custCity: appointmentData.customer.address?.city || '',
    custState: appointmentData.customer.address?.state || '',
    custZip: appointmentData.customer.address?.zip || '',
    apptDate: formatDateForApi(appointmentData.date),
    apptTime: apptTime,
    apptDescription: apptDescription,
    apptCode: appointmentData.time === 'am-dropoff' ? 'AM_DROPOFF' : '',
    comment: appointmentData.serviceDescription || '',
    vehTag: appointmentData.customer.vehicle?.licensePlate || '',
    vehMake: appointmentData.customer.vehicle?.make || '',
    vehModel: appointmentData.customer.vehicle?.model || '',
    vehYear: appointmentData.customer.vehicle?.year || '',
    vehVin: appointmentData.customer.vehicle?.vin || '',
    vehMileage: appointmentData.customer.vehicle?.mileage ? parseInt(appointmentData.customer.vehicle.mileage.replace(/[^0-9]/g, '')) || 0 : 0,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
}

/**
 * Filters appointments by date range
 */
function filterByDateRange(appointments: AppointmentRequest[], filters: AppointmentRequestFilters): AppointmentRequest[] {
  if (!filters.dateRange) {
    return appointments
  }

  const now = new Date()
  let fromDate: Date
  let toDate: Date

  switch (filters.dateRange) {
    case 'Today':
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      break
    case 'Yesterday':
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59)
      break
    case 'Tomorrow':
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59)
      break
    case 'This Week':
      const dayOfWeek = now.getDay()
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek)
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - dayOfWeek), 23, 59, 59)
      break
    case 'Last Week':
      const lastWeekDayOfWeek = now.getDay()
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - lastWeekDayOfWeek - 7)
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - lastWeekDayOfWeek - 1, 23, 59, 59)
      break
    case 'This Month':
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1)
      toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      break
    case 'Last Month':
      fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
      break
    case 'This Quarter':
      const quarter = Math.floor(now.getMonth() / 3)
      fromDate = new Date(now.getFullYear(), quarter * 3, 1)
      toDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59)
      break
    case 'Last Quarter':
      const lastQuarter = Math.floor(now.getMonth() / 3)
      const lastQuarterStart = lastQuarter === 0 ? 9 : (lastQuarter - 1) * 3
      const lastQuarterYear = lastQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear()
      fromDate = new Date(lastQuarterYear, lastQuarterStart, 1)
      toDate = new Date(lastQuarterYear, lastQuarterStart + 3, 0, 23, 59, 59)
      break
    case 'This Year':
      fromDate = new Date(now.getFullYear(), 0, 1)
      toDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
      break
    case 'Last Year':
      fromDate = new Date(now.getFullYear() - 1, 0, 1)
      toDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59)
      break
    case 'Custom Date Range':
      if (filters.customFromDate && filters.customToDate) {
        const fromParts = filters.customFromDate.split('/')
        const toParts = filters.customToDate.split('/')
        if (fromParts.length === 3 && toParts.length === 3) {
          fromDate = new Date(`${fromParts[2]}-${fromParts[0]}-${fromParts[1]}`)
          toDate = new Date(`${toParts[2]}-${toParts[0]}-${toParts[1]}`)
          toDate.setHours(23, 59, 59, 999)
        } else {
          return appointments
        }
      } else {
        return appointments
      }
      break
    default:
      return appointments
  }

  return appointments.filter(apt => {
    const aptDateParts = apt.apptDate.split('/')
    if (aptDateParts.length !== 3) return false
    const aptDate = new Date(`${aptDateParts[2]}-${aptDateParts[0]}-${aptDateParts[1]}`)
    return aptDate >= fromDate && aptDate <= toDate
  })
}

/**
 * Fetches appointment requests from localStorage
 * These are appointments with status "Online Appointment" that need approval
 */
export async function fetchAppointmentRequests(filters: AppointmentRequestFilters): Promise<AppointmentRequest[]> {
  try {
    // Try API first
    const params = new URLSearchParams()
    if (filters.dateRange) params.append('dateRange', filters.dateRange)
    if (filters.customFromDate) params.append('customFromDate', filters.customFromDate)
    if (filters.customToDate) params.append('customToDate', filters.customToDate)
    if (filters.status && filters.status !== 'All Statuses') {
      params.append('status', filters.status)
    }

    const response = await fetch(`/api/appointment-requests?${params.toString()}`)
    if (response.ok) {
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text()
        if (text.trim()) {
          try {
            const data = JSON.parse(text)
            if (data.appointmentRequests && Array.isArray(data.appointmentRequests)) {
              return data.appointmentRequests
            }
          } catch (parseError) {
            console.error('Error parsing JSON response:', parseError)
            console.error('Response text:', text.substring(0, 200)) // Log first 200 chars for debugging
          }
        }
      } else {
        console.warn('API response is not JSON, falling back to localStorage')
      }
    } else {
      console.warn(`API request failed with status ${response.status}, falling back to localStorage`)
    }
  } catch (error) {
    console.error('Error fetching appointment requests from API:', error)
  }

  // Fall back to localStorage
  try {
    const stored = localStorage.getItem(APPOINTMENTS_STORAGE_KEY)
    if (!stored) {
      return []
    }

    let appointments: AppointmentRequest[] = JSON.parse(stored)

    // Filter by status
    if (filters.status && filters.status !== 'All Statuses') {
      appointments = appointments.filter(apt => apt.status === filters.status)
    }

    // Filter by date range
    appointments = filterByDateRange(appointments, filters)

    return appointments
  } catch (error) {
    console.error('Error fetching appointment requests from localStorage:', error)
    return []
  }
}

/**
 * Approves an appointment request
 */
export async function approveAppointmentRequest(requestId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/appointment-requests/${requestId}/approve`, {
      method: 'POST',
    })
    if (response.ok) {
      // Update localStorage
      updateAppointmentStatus(requestId, 'approved')
      return { success: true }
    }
    throw new Error(`Failed to approve appointment: ${response.statusText}`)
  } catch (error: any) {
    console.error('Error approving appointment:', error)
    // Still update localStorage even if API fails
    updateAppointmentStatus(requestId, 'approved')
    return {
      success: false,
      error: error.message || 'Failed to approve appointment',
    }
  }
}

/**
 * Declines an appointment request
 */
export async function declineAppointmentRequest(requestId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/appointment-requests/${requestId}/decline`, {
      method: 'POST',
    })
    if (response.ok) {
      // Update localStorage
      updateAppointmentStatus(requestId, 'declined')
      return { success: true }
    }
    throw new Error(`Failed to decline appointment: ${response.statusText}`)
  } catch (error: any) {
    console.error('Error declining appointment:', error)
    // Still update localStorage even if API fails
    updateAppointmentStatus(requestId, 'declined')
    return {
      success: false,
      error: error.message || 'Failed to decline appointment',
    }
  }
}

/**
 * Updates appointment status in localStorage
 */
function updateAppointmentStatus(id: number, status: 'pending' | 'approved' | 'declined'): void {
  try {
    const stored = localStorage.getItem(APPOINTMENTS_STORAGE_KEY)
    if (!stored) return
    
    const appointments: AppointmentRequest[] = JSON.parse(stored)
    const updated = appointments.map(apt => 
      apt.id === id ? { ...apt, status } : apt
    )
    localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Error updating appointment status:', error)
  }
}

/**
 * Storage key for reschedule tokens in localStorage
 */
export const RESCHEDULE_STORAGE_KEY = 'appointment_reschedule_tokens'

/**
 * Interface for decline notification data
 */
export interface DeclineNotificationData {
  appointmentId: number
  message: string
  timeSlotLinks: Array<{ date: string; time: string; link: string }>
  generalLink: string
  customer: {
    name: string
    phone?: string
    email?: string
  }
}

/**
 * Interface for reschedule confirmation data
 */
export interface RescheduleConfirmationData {
  token: string
  date: string
  time: string
}

/**
 * Sends decline notification to customer via SMS/Email
 * Uses a different API endpoint than sendHitsNotification
 */
export async function sendDeclineNotification(
  data: DeclineNotificationData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Store reschedule data in localStorage for token lookup
    const stored = localStorage.getItem(APPOINTMENTS_STORAGE_KEY)
    if (!stored) {
      return { success: false, error: 'Appointment not found' }
    }
    
    const appointments: AppointmentRequest[] = JSON.parse(stored)
    const appointment = appointments.find(apt => apt.id === data.appointmentId)
    
    if (!appointment) {
      return { success: false, error: 'Appointment not found' }
    }
    
    // Store reschedule tokens for each time slot
    const rescheduleTokens = JSON.parse(localStorage.getItem(RESCHEDULE_STORAGE_KEY) || '{}')
    
    data.timeSlotLinks.forEach(slot => {
      const tokenKey = `${data.appointmentId}_${slot.date}_${slot.time}`
      rescheduleTokens[tokenKey] = {
        appointmentId: data.appointmentId,
        appointment: appointment,
        date: slot.date,
        time: slot.time,
        link: slot.link,
        createdAt: new Date().toISOString(),
      }
    })
    
    // Store general reschedule token
    const generalTokenKey = `${data.appointmentId}_general`
    rescheduleTokens[generalTokenKey] = {
      appointmentId: data.appointmentId,
      appointment: appointment,
      timeSlotLinks: data.timeSlotLinks,
      generalLink: data.generalLink,
      createdAt: new Date().toISOString(),
    }
    
    localStorage.setItem(RESCHEDULE_STORAGE_KEY, JSON.stringify(rescheduleTokens))
    
    // Build message with HTML formatting for email and plain text for SMS
    let emailMessage = data.message
    let smsMessage = data.message
    
    if (data.timeSlotLinks.length > 0) {
      emailMessage += '\n\n<h3>Available Times:</h3><ul>'
      smsMessage += '\n\nAvailable Times:'
      
      data.timeSlotLinks.forEach((slot, index) => {
        const dateDisplay = formatDateForDisplay(slot.date)
        const timeDisplay = formatTimeForDisplay(slot.time)
        emailMessage += `\n<li><a href="${slot.link}">${dateDisplay} at ${timeDisplay}</a></li>`
        smsMessage += `\n${index + 1}. ${dateDisplay} at ${timeDisplay}: ${slot.link}`
      })
      
      emailMessage += '\n</ul>'
    }
    
    emailMessage += `\n<p><a href="${data.generalLink}">Or choose a different time</a></p>`
    smsMessage += `\n\nOr choose a different time: ${data.generalLink}`
    
    if (data.customer.email) {
      const emailResult = await sendEmail(buildSendEmailRequest({
        to: data.customer.email,
        subject: 'Appointment Reschedule Options',
        body: emailMessage,
        bodyIsHtml: true,
      }))
      if (!emailResult.success) {
        return { success: false, error: emailResult.error || 'Failed to send decline email notification' }
      }
    }

    if (data.customer.phone) {
      const smsResult = await sendChatMessage({
        phone: data.customer.phone,
        body: smsMessage,
        channel: 'sms',
      })
      if (!smsResult.success) {
        return { success: false, error: smsResult.error || 'Failed to send decline SMS notification' }
      }
    }
    
    return { success: true }
  } catch (error: any) {
    console.error('Error sending decline notification:', error)
    return {
      success: false,
      error: error.message || 'Failed to send decline notification',
    }
  }
}

/**
 * Confirms reschedule and sends notification
 */
export async function confirmReschedule(
  data: RescheduleConfirmationData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Decode token to get appointment ID
    const { validateAppointmentToken } = await import('@/lib/appointment-token')
    const validation = validateAppointmentToken(HITS_ACCOUNT, data.token)
    
    if (!validation.valid || !validation.params) {
      return { success: false, error: validation.error || 'Invalid token' }
    }
    
    const appointmentId = parseInt(validation.params.i)
    
    // Get appointment from localStorage
    const stored = localStorage.getItem(APPOINTMENTS_STORAGE_KEY)
    if (!stored) {
      return { success: false, error: 'Appointment not found' }
    }
    
    const appointments: AppointmentRequest[] = JSON.parse(stored)
    const appointment = appointments.find(apt => apt.id === appointmentId)
    
    if (!appointment) {
      return { success: false, error: 'Appointment not found' }
    }
    
    // Update appointment with new date/time
    const updatedAppointments = appointments.map(apt => {
      if (apt.id === appointmentId) {
        return {
          ...apt,
          apptDate: formatDateForApi(data.date),
          apptTime: convertTimeTo24Hour(data.time),
          status: 'pending' as const, // Reset to pending for new time
        }
      }
      return apt
    })
    
    localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(updatedAppointments))
    
    // Build notification payload with updated date/time and all customer/vehicle data
    // data.date is in YYYY-MM-DD format, convert to MM/DD/YYYY for API
    const updatedApptTime = convertTimeTo24Hour(data.time)
    const updatedApptDate = formatDateForApi(data.date)
    
    // Determine custNum: undefined if customer not found (0 or undefined), otherwise use the value
    const custNum = appointment.custNum && appointment.custNum > 0 
      ? appointment.custNum 
      : undefined
    
    // Build the notification payload
    const notificationPayload: HitsNotificationPayload = {
      handlerId: 1,
      notificationType: 'Online Appointment',
      ticketNum: 0, // Appointments don't have ticket numbers initially
      storeNum: getSelectedStoreNum(),
      custNum: custNum,
      custFirstName: appointment.custFirstName,
      custLastName: appointment.custLastName,
      custEmail: appointment.custEmail || '',
      custPhone: appointment.custPhone || '',
      custMobile: appointment.custMobile || appointment.custPhone || '',
      custAddress: appointment.custAddress || '',
      custCity: appointment.custCity || '',
      custState: appointment.custState || '',
      custZip: appointment.custZip || '',
      apptDate: updatedApptDate, // Use the new rescheduled date
      apptTime: updatedApptTime, // Use the new rescheduled time
      apptDescription: appointment.apptDescription || '',
      apptCode: data.time === 'am-dropoff' ? 'AM_DROPOFF' : appointment.apptCode || '',
      apptVehStatus: 65,
      apptCancel: '',
      comment: appointment.comment || '',
      vehTag: appointment.vehTag || '',
      vehMake: appointment.vehMake || '',
      vehModel: appointment.vehModel || '',
      vehYear: appointment.vehYear || '',
      vehVin: appointment.vehVin || '',
      vehMileage: appointment.vehMileage && appointment.vehMileage > 0 ? appointment.vehMileage : undefined,
      attrType: '',
      attrMemo: '',
      attrLink: '',
    }
    
    // Send notification via API
    try {
      const notificationResult = await sendHitsNotification(notificationPayload)
      if (!notificationResult.success) {
        console.error('Failed to send reschedule notification:', notificationResult.error)
        // Still return success since the appointment was updated
        // The notification failure is logged but doesn't block the reschedule
      }
    } catch (notificationError: any) {
      console.error('Error sending reschedule notification:', notificationError)
      // Still return success since the appointment was updated
      // The notification failure is logged but doesn't block the reschedule
    }
    
    return { success: true }
  } catch (error: any) {
    console.error('Error confirming reschedule:', error)
    return {
      success: false,
      error: error.message || 'Failed to confirm reschedule',
    }
  }
}

/**
 * Helper function to format date for display (MM/DD/YYYY to readable format)
 */
function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Helper function to format time for display
 */
function formatTimeForDisplay(time: string): string {
  if (time === 'am-dropoff') {
    return 'AM dropoff'
  }
  const [hourStr, minuteStr] = time.split(':')
  const hour = parseInt(hourStr)
  const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  const ampm = hour < 12 ? 'AM' : 'PM'
  return `${hour12}:${minuteStr} ${ampm}`
}

const MODULE_STORAGE_KEY = 'hd_appointments_module_records'
const MODULE_ICAL_STATUS_KEY = 'hd_appointments_ical_status'
const MODULE_COLOR_DEFAULTS_KEY = 'hd_appointments_color_defaults'
const MODULE_COLOR_OVERRIDES_KEY = 'hd_appointments_color_overrides'

export const APPOINTMENT_BLOCK_COLOR_OPTIONS: Array<{
  key: AppointmentBlockColorKey
  label: string
  classToken: string
}> = [
  { key: 'blue', label: 'Blue', classToken: 'bg-blue-100 border-blue-300 text-blue-900' },
  { key: 'indigo', label: 'Indigo', classToken: 'bg-indigo-100 border-indigo-300 text-indigo-900' },
  { key: 'emerald', label: 'Emerald', classToken: 'bg-emerald-100 border-emerald-300 text-emerald-900' },
  { key: 'amber', label: 'Amber', classToken: 'bg-amber-100 border-amber-300 text-amber-900' },
  { key: 'rose', label: 'Rose', classToken: 'bg-rose-100 border-rose-300 text-rose-900' },
  { key: 'violet', label: 'Violet', classToken: 'bg-violet-100 border-violet-300 text-violet-900' },
  { key: 'slate', label: 'Slate', classToken: 'bg-slate-100 border-slate-300 text-slate-700' },
]

const COLOR_CLASS_BY_KEY: Record<AppointmentBlockColorKey, string> = APPOINTMENT_BLOCK_COLOR_OPTIONS.reduce(
  (acc, option) => {
    acc[option.key] = option.classToken
    return acc
  },
  {} as Record<AppointmentBlockColorKey, string>
)

const LEGACY_TYPE_COLOR_BY_RECORD_TYPE: Record<AppointmentRecordType, string> = {
  quick_note: 'bg-yellow-100 border-yellow-300 text-yellow-900',
  schedule_note: 'bg-slate-100 border-slate-300 text-slate-700',
  booked_unconfirmed: 'bg-sky-200 border-sky-400 text-sky-950',
  confirmed: 'bg-blue-500 border-blue-600 text-white',
}

const DEFAULT_COLOR_KEY_BY_TYPE: Record<AppointmentColorScopeType, AppointmentBlockColorKey> = {
  quick_note: 'amber',
  schedule_note: 'slate',
  booked_unconfirmed: 'slate',
  confirmed: 'indigo',
}

type AppointmentColorDefaults = Partial<Record<AppointmentColorScopeType, AppointmentBlockColorKey>>
type AppointmentColorOverrides = Record<string, AppointmentBlockColorKey>

const DEFAULT_FILTERS: AppointmentFilters = {
  search: '',
  bayIds: [],
  recordTypes: [],
  statuses: [],
  sortBy: 'date_time_asc',
}

export interface ListAppointmentsOptions {
  requestedStartDate?: string
  refreshPosCache?: boolean
}

export interface AppointmentMutationOptions {
  syncIcal?: boolean
}

let posInvoiceCache: Invoice[] = []
let posInvoiceCacheFromIso: string | null = null
let posInvoiceCacheToIso: string | null = null
let posInvoiceCacheStoreNum: number | null = null
let posInvoiceCacheLoading: Promise<void> | null = null

function chatApiBaseForIcal(): string {
  const raw = import.meta.env.VITE_CHAT_API_BASE_URL || ''
  if (String(raw).trim()) {
    return String(raw).replace(/\/+$/, '')
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '')
  }
  return ''
}

export function getAppointmentsIcalUrl(options?: { storeId?: string; from?: string; to?: string }): string {
  const base = chatApiBaseForIcal()
  if (!base) return ''
  const url = new URL(`${base}/appointments/ical`)
  if (options?.storeId) url.searchParams.set('storeId', options.storeId)
  if (options?.from) url.searchParams.set('from', options.from)
  if (options?.to) url.searchParams.set('to', options.to)
  return url.toString()
}

async function postIcalCache(payload: unknown): Promise<boolean> {
  const base = chatApiBaseForIcal()
  if (!base) return false
  try {
    const response = await fetch(`${base}/appointments/ical/cache`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    })
    return response.ok
  } catch {
    return false
  }
}

const queuedIcalUpserts = new Map<string, AppointmentRecord>()
const queuedIcalDeletes = new Set<string>()
let activeIcalFlush: Promise<void> | null = null

function enqueueIcalUpsert(record: AppointmentRecord) {
  queuedIcalDeletes.delete(record.id)
  queuedIcalUpserts.set(record.id, record)
  void setIcalSyncInfo(record.id, { status: 'not_synced' })
  void flushIcalQueue()
}

function enqueueIcalDelete(recordId: string) {
  queuedIcalUpserts.delete(recordId)
  queuedIcalDeletes.add(recordId)
  void setIcalSyncInfo(recordId, { status: 'not_synced' })
  void flushIcalQueue()
}

async function flushIcalQueue(): Promise<void> {
  if (activeIcalFlush) {
    return activeIcalFlush
  }
  activeIcalFlush = (async () => {
    while (queuedIcalDeletes.size > 0 || queuedIcalUpserts.size > 0) {
      const deleteIds = Array.from(queuedIcalDeletes)
      queuedIcalDeletes.clear()
      for (const recordId of deleteIds) {
        const deleted = await postIcalCache({ id: recordId, deleted: true })
        if (deleted) {
          await setIcalSyncInfo(recordId, { status: 'synced', lastSyncedAt: new Date().toISOString() })
        } else {
          await setIcalSyncInfo(recordId, { status: 'error' })
        }
      }

      const upserts = Array.from(queuedIcalUpserts.values())
      queuedIcalUpserts.clear()
      for (const record of upserts) {
        const synced = await postIcalCache({
          id: record.id,
          storeId: record.storeId,
          customerName: record.customerName,
          customerPhone: record.customerPhone || '',
          customerEmail: record.customerEmail || '',
          recordType: record.recordType,
          status: record.status,
          requestedDate: record.requestedDate,
          requestedTime: record.requestedTime,
          requestedDuration: record.requestedDuration,
          bayName: record.bayName || '',
          note: record.note || '',
          updatedAt: record.updatedAt,
        })
        if (synced) {
          await setIcalSyncInfo(record.id, { status: 'synced', lastSyncedAt: new Date().toISOString() })
        } else {
          await setIcalSyncInfo(record.id, { status: 'error' })
        }
      }
    }
  })().finally(() => {
    activeIcalFlush = null
  })
  return activeIcalFlush
}

function createSeedAppointments(): AppointmentRecord[] {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const tomorrowDate = tomorrow.toISOString().slice(0, 10)

  return [
    {
      id: 'appt-1',
      accountId: HITS_ACCOUNT,
      storeId: String(getSelectedStoreNum()),
      customerName: 'Jordan Lane',
      customerPhone: '5551234567',
      customerEmail: 'jordan@example.com',
      sendText: true,
      sendEmail: false,
      recordType: 'confirmed',
      status: 'confirmed',
      requestedDate: today,
      requestedTime: '09:00',
      requestedDuration: 60,
      bayId: 'bay-1',
      bayName: 'Bay 1',
      note: 'Brake inspection and tire rotation',
      createdBy: 'Staff',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      posFlag: false,
      apiSubmitted: false,
      confirmedAt: new Date().toISOString(),
      confirmedBy: 'Staff',
      vehicle: { year: '2020', make: 'Toyota', model: 'Camry', licensePlate: 'ABC123' },
    },
    {
      id: 'appt-2',
      accountId: HITS_ACCOUNT,
      storeId: String(getSelectedStoreNum()),
      customerName: 'Chris Kim',
      customerPhone: '5554443322',
      customerEmail: 'chris@example.com',
      sendText: true,
      sendEmail: true,
      recordType: 'booked_unconfirmed',
      status: 'unconfirmed',
      requestedDate: today,
      requestedTime: '10:30',
      requestedDuration: 45,
      bayId: 'NB',
      bayName: 'No Bay',
      note: 'Requested through booking widget',
      createdBy: 'Widget',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      posFlag: false,
      apiSubmitted: true,
      vehicle: { year: '2018', make: 'Honda', model: 'Civic', licensePlate: 'XYZ987' },
    },
    {
      id: 'appt-3',
      accountId: HITS_ACCOUNT,
      storeId: String(getSelectedStoreNum()),
      customerName: 'Bay 2 Closure',
      sendText: false,
      sendEmail: false,
      recordType: 'schedule_note',
      scheduleBlockerType: 'bay_blocker',
      status: 'unconfirmed',
      requestedDate: tomorrowDate,
      requestedTime: '13:00',
      requestedDuration: 90,
      bayId: 'bay-2',
      bayName: 'Bay 2',
      note: 'Alignment rack maintenance',
      createdBy: 'Manager',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      posFlag: false,
      apiSubmitted: false,
    },
  ]
}

export type AppointmentViewMode = 'calendar' | 'bay' | 'list'

export function isAppointmentRecordType(recordType: AppointmentRecordType): boolean {
  return recordType === 'booked_unconfirmed' || recordType === 'confirmed'
}

export function isNoteRecordType(recordType: AppointmentRecordType): boolean {
  return recordType === 'quick_note' || recordType === 'schedule_note'
}

export function requiresCustomerNameForRecordType(recordType: AppointmentRecordType): boolean {
  return isAppointmentRecordType(recordType)
}

export function requiresScheduleBlockerTypeForRecordType(recordType: AppointmentRecordType): boolean {
  return recordType === 'schedule_note'
}

export function isRecordVisibleInView(record: AppointmentRecord, view: AppointmentViewMode): boolean {
  if (view === 'list') {
    return isAppointmentRecordType(record.recordType)
  }
  return true
}

function readModuleRecords(): AppointmentRecord[] {
  const raw = localStorage.getItem(MODULE_STORAGE_KEY)
  if (!raw) {
    const seed = createSeedAppointments()
    localStorage.setItem(MODULE_STORAGE_KEY, JSON.stringify(seed))
    return seed
  }

  try {
    return JSON.parse(raw) as AppointmentRecord[]
  } catch {
    const seed = createSeedAppointments()
    localStorage.setItem(MODULE_STORAGE_KEY, JSON.stringify(seed))
    return seed
  }
}

function writeModuleRecords(records: AppointmentRecord[]): void {
  localStorage.setItem(MODULE_STORAGE_KEY, JSON.stringify(records))
}

export function getColorScopeTypeForRecordType(recordType: AppointmentRecordType): AppointmentColorScopeType {
  return recordType
}

function isColorKey(value: unknown): value is AppointmentBlockColorKey {
  return typeof value === 'string' && APPOINTMENT_BLOCK_COLOR_OPTIONS.some((option) => option.key === value)
}

export function readAppointmentColorDefaults(): AppointmentColorDefaults {
  const raw = localStorage.getItem(MODULE_COLOR_DEFAULTS_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const next: AppointmentColorDefaults = {}
    const scopeTypes: AppointmentColorScopeType[] = ['confirmed', 'booked_unconfirmed', 'quick_note', 'schedule_note']
    for (const scopeType of scopeTypes) {
      if (isColorKey(parsed[scopeType])) {
        next[scopeType] = parsed[scopeType]
      }
    }
    return next
  } catch {
    return {}
  }
}

export function writeAppointmentColorDefaults(defaults: AppointmentColorDefaults): void {
  const scopeTypes: AppointmentColorScopeType[] = ['confirmed', 'booked_unconfirmed', 'quick_note', 'schedule_note']
  const normalized: AppointmentColorDefaults = {}
  for (const scopeType of scopeTypes) {
    const value = defaults[scopeType]
    if (value && isColorKey(value)) {
      normalized[scopeType] = value
    }
  }
  localStorage.setItem(MODULE_COLOR_DEFAULTS_KEY, JSON.stringify(normalized))
}

export function readAppointmentColorOverrides(): AppointmentColorOverrides {
  const raw = localStorage.getItem(MODULE_COLOR_OVERRIDES_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const next: AppointmentColorOverrides = {}
    for (const [id, value] of Object.entries(parsed)) {
      if (!id || !isColorKey(value)) continue
      next[id] = value
    }
    return next
  } catch {
    return {}
  }
}

export function writeAppointmentColorOverrides(overrides: AppointmentColorOverrides): void {
  const normalized: AppointmentColorOverrides = {}
  for (const [id, value] of Object.entries(overrides)) {
    if (!id || !isColorKey(value)) continue
    normalized[id] = value
  }
  localStorage.setItem(MODULE_COLOR_OVERRIDES_KEY, JSON.stringify(normalized))
}

export function setAppointmentRecordColorOverride(recordId: string, colorKey?: AppointmentBlockColorKey): void {
  const overrides = readAppointmentColorOverrides()
  if (colorKey && isColorKey(colorKey)) {
    overrides[recordId] = colorKey
  } else {
    delete overrides[recordId]
  }
  writeAppointmentColorOverrides(overrides)
}

export async function applyColorToAllRecordsOfType(
  recordType: AppointmentRecordType,
  colorKey: AppointmentBlockColorKey
): Promise<void> {
  const scopeType = getColorScopeTypeForRecordType(recordType)
  const defaults = readAppointmentColorDefaults()
  writeAppointmentColorDefaults({
    ...defaults,
    [scopeType]: colorKey,
  })

  const records = readModuleRecords()
  let changed = false
  const nowIso = new Date().toISOString()
  const next = records.map((record) => {
    if (getColorScopeTypeForRecordType(record.recordType) !== scopeType) return record
    if (record.colorOverride === undefined) return record
    changed = true
    return {
      ...record,
      colorOverride: undefined,
      updatedAt: nowIso,
    }
  })
  if (changed) {
    writeModuleRecords(next)
  }
  const overrides = readAppointmentColorOverrides()
  let overrideChanged = false
  for (const recordId of Object.keys(overrides)) {
    const record = next.find((item) => item.id === recordId)
    if (record && getColorScopeTypeForRecordType(record.recordType) === scopeType) {
      delete overrides[recordId]
      overrideChanged = true
    }
  }
  if (overrideChanged) {
    writeAppointmentColorOverrides(overrides)
  }
}

export function getTypeDefaultColorKey(
  recordType: AppointmentRecordType,
  defaults?: AppointmentColorDefaults
): AppointmentBlockColorKey {
  const scopeType = getColorScopeTypeForRecordType(recordType)
  const mergedDefaults = defaults || readAppointmentColorDefaults()
  const configured = mergedDefaults[scopeType]
  if (configured && isColorKey(configured)) return configured
  return DEFAULT_COLOR_KEY_BY_TYPE[scopeType]
}

export function getResolvedRecordColorToken(
  record: Pick<AppointmentRecord, 'recordType' | 'colorOverride'>,
  defaults?: AppointmentColorDefaults
): string {
  const overrideKey = record.colorOverride
  if (overrideKey && isColorKey(overrideKey)) {
    return COLOR_CLASS_BY_KEY[overrideKey]
  }
  const typeDefaultKey = getTypeDefaultColorKey(record.recordType, defaults)
  const typeDefaultToken = COLOR_CLASS_BY_KEY[typeDefaultKey]
  if (typeDefaultToken) return typeDefaultToken
  return LEGACY_TYPE_COLOR_BY_RECORD_TYPE[record.recordType]
}

function normalizeRecord(record: AppointmentRecord): AppointmentRecord {
  const bayFromConfig = STATIC_BAY_CONFIG.find((bay) => bay.bayId === (record.bayId || 'NB'))
  return {
    ...record,
    status: normalizeAppointmentStatus(record),
    bayId: record.bayId || 'NB',
    bayName: bayFromConfig?.bayName || record.bayName || 'No Bay',
    updatedAt: new Date().toISOString(),
  }
}

function normalizeAppointmentStatus(record: AppointmentRecord): AppointmentStatus {
  if (record.status === 'confirmed' || record.status === 'unconfirmed') {
    return record.status
  }
  if (record.recordType === 'confirmed' || Boolean(record.confirmedAt) || Boolean(record.confirmedBy)) {
    return 'confirmed'
  }
  return 'unconfirmed'
}

export function sortAppointmentRecords(records: AppointmentRecord[], sortBy: AppointmentSortBy): AppointmentRecord[] {
  const direction = sortBy.endsWith('_desc') ? -1 : 1
  const statusWeight = (record: AppointmentRecord, confirmedFirst: boolean): number => {
    const isConfirmed = record.status === 'confirmed'
    if (confirmedFirst) return isConfirmed ? 0 : 1
    return isConfirmed ? 1 : 0
  }

  return [...records].sort((a, b) => {
    let value = 0
    switch (sortBy) {
      case 'date_time_asc':
      case 'date_time_desc':
        value =
          a.requestedDate.localeCompare(b.requestedDate) || a.requestedTime.localeCompare(b.requestedTime)
        break
      case 'customer_asc':
      case 'customer_desc':
        value = a.customerName.localeCompare(b.customerName)
        break
      case 'status_confirmed_first':
        value = statusWeight(a, true) - statusWeight(b, true)
        break
      case 'status_unconfirmed_first':
        value = statusWeight(a, false) - statusWeight(b, false)
        break
      default:
        value = 0
    }

    if (sortBy === 'status_confirmed_first' || sortBy === 'status_unconfirmed_first') {
      return (
        value ||
        a.requestedDate.localeCompare(b.requestedDate) ||
        a.requestedTime.localeCompare(b.requestedTime) ||
        a.id.localeCompare(b.id)
      )
    }

    return (
      value * direction ||
      a.requestedDate.localeCompare(b.requestedDate) ||
      a.requestedTime.localeCompare(b.requestedTime) ||
      a.id.localeCompare(b.id)
    )
  })
}

function formatDateForLookup(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  return `${month}/${day}/${year}`
}

function parseIsoDate(value: string): Date {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return new Date()
  }
  return parsed
}

function addDaysIso(value: string, deltaDays: number): string {
  const date = parseIsoDate(value)
  date.setDate(date.getDate() + deltaDays)
  return formatDateLocal(date)
}

function addYearsIso(value: string, deltaYears: number): string {
  const date = parseIsoDate(value)
  date.setFullYear(date.getFullYear() + deltaYears)
  return formatDateLocal(date)
}

function buildInvoiceCacheKey(invoice: Invoice): string {
  return [
    String(invoice.StoreNum ?? ''),
    String(invoice.InvoiceNum ?? ''),
    String(invoice.InvoiceVersion ?? ''),
    String(invoice.ApptDateTime ?? ''),
  ].join('|')
}

function mergeInvoiceCache(existing: Invoice[], incoming: Invoice[]): Invoice[] {
  const byKey = new Map<string, Invoice>()
  for (const invoice of existing) {
    byKey.set(buildInvoiceCacheKey(invoice), invoice)
  }
  for (const invoice of incoming) {
    byKey.set(buildInvoiceCacheKey(invoice), invoice)
  }
  return Array.from(byKey.values())
}

async function fetchAndMergePosInvoices(fromIso: string, toIso: string): Promise<void> {
  if (fromIso > toIso) {
    return
  }
  const fromDate = formatDateForLookup(parseIsoDate(fromIso))
  const toDate = formatDateForLookup(parseIsoDate(toIso))
  const fetched = await fetchPosAppointments({ fromDate, toDate })
  posInvoiceCache = mergeInvoiceCache(posInvoiceCache, fetched)
}

async function ensurePosInvoiceCache(options: {
  requestedStartDate?: string
  refresh?: boolean
}): Promise<void> {
  const requestStart = (options.requestedStartDate || '').trim()
  const todayIso = formatDateLocal(new Date())
  const oneYearFromTodayIso = addYearsIso(todayIso, 1)
  const selectedStoreNum = getSelectedStoreNum()
  const shouldResetCache =
    options.refresh === true ||
    posInvoiceCacheStoreNum !== selectedStoreNum ||
    !posInvoiceCacheFromIso ||
    !posInvoiceCacheToIso

  const runLoad = async () => {
    if (shouldResetCache) {
      posInvoiceCache = []
      posInvoiceCacheStoreNum = selectedStoreNum
      posInvoiceCacheFromIso = todayIso
      posInvoiceCacheToIso = oneYearFromTodayIso
      await fetchAndMergePosInvoices(todayIso, oneYearFromTodayIso)
    }

    if (!requestStart || requestStart >= todayIso) {
      return
    }

    const cacheFrom = posInvoiceCacheFromIso || todayIso
    if (requestStart >= cacheFrom) {
      return
    }

    const backfillTo = addDaysIso(cacheFrom, -1)
    await fetchAndMergePosInvoices(requestStart, backfillTo)
    posInvoiceCacheFromIso = requestStart
  }

  if (posInvoiceCacheLoading) {
    await posInvoiceCacheLoading
  }
  const loader = runLoad()
  posInvoiceCacheLoading = loader
  try {
    await loader
  } finally {
    if (posInvoiceCacheLoading === loader) {
      posInvoiceCacheLoading = null
    }
  }
}

function parseApptDateTime(value: string): Date | null {
  const raw = (value || '').trim()
  if (!raw) return null
  const match = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?:\s*([AP]M))?)?$/i
  )
  if (!match) return null

  const month = parseInt(match[1], 10)
  const day = parseInt(match[2], 10)
  const year = parseInt(match[3], 10)
  let hour = match[4] ? parseInt(match[4], 10) : 0
  const minute = match[5] ? parseInt(match[5], 10) : 0
  const meridiem = (match[6] || '').toUpperCase()

  if (meridiem === 'PM' && hour < 12) hour += 12
  if (meridiem === 'AM' && hour === 12) hour = 0

  const parsed = new Date(year, month - 1, day, hour, minute, 0, 0)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function formatDateLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTimeLocal(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function normalizeText(input: string | number | null | undefined): string {
  return String(input ?? '').trim().toLowerCase()
}

function mapPosBay(invoice: Invoice): { bayId: string; bayName: string } {
  const codeRaw = String(invoice.BayCode ?? '').trim()
  const textRaw = String(invoice.BayText ?? '').trim()
  const code = normalizeText(codeRaw)
  const text = normalizeText(textRaw)
  const bayByCode = STATIC_BAY_CONFIG.find((bay) => normalizeText(bay.bayId) === code)
  if (bayByCode && code && code !== '0' && code !== 'nb') {
    return { bayId: bayByCode.bayId, bayName: bayByCode.bayName }
  }

  const bayByText = STATIC_BAY_CONFIG.find((bay) => normalizeText(bay.bayName) === text)
  if (bayByText && text && text !== '0' && text !== 'no bay') {
    return { bayId: bayByText.bayId, bayName: bayByText.bayName }
  }

  return { bayId: 'NB', bayName: 'No Bay' }
}

function parseDuration(raw: string | number | null | undefined): number {
  if (raw == null || raw === '') return 60
  const duration = typeof raw === 'string' ? parseInt(raw, 10) : Number(raw)
  return Number.isFinite(duration) && duration > 0 ? duration : 60
}

function buildCompositeIdentity(input: {
  storeId?: string | number | null
  customerName?: string
  requestedDate?: string
  requestedTime?: string
  licensePlate?: string
}): string {
  return [
    normalizeText(input.storeId),
    normalizeText(input.customerName),
    normalizeText(input.requestedDate),
    normalizeText(input.requestedTime),
    normalizeText(input.licensePlate),
  ].join('|')
}

/** POS ticket / invoice number for INVOICE_LOOKUP and UI labels (integratorId, else pos-{store}-{num} id). */
export function getAppointmentLinkedInvoiceNum(record: AppointmentRecord): number | null {
  const fromIntegrator = parseInt(String(record.integratorId || '').trim(), 10)
  if (Number.isFinite(fromIntegrator) && fromIntegrator > 0) {
    return fromIntegrator
  }
  const posIdMatch = record.id.match(/^pos-\d+-(\d+)$/)
  if (posIdMatch?.[1]) {
    const fromId = parseInt(posIdMatch[1], 10)
    if (Number.isFinite(fromId) && fromId > 0) {
      return fromId
    }
  }
  return null
}

export function formatAppointmentTicketNumber(record: AppointmentRecord): string | null {
  const n = getAppointmentLinkedInvoiceNum(record)
  return n != null ? `#${n}` : null
}

function localIdentityKeys(record: AppointmentRecord): string[] {
  const keys = new Set<string>()
  const linked = getAppointmentLinkedInvoiceNum(record)
  if (linked != null) {
    keys.add(`invoice:${linked}`)
  }
  keys.add(
    `composite:${buildCompositeIdentity({
      storeId: record.storeId,
      customerName: record.customerName,
      requestedDate: record.requestedDate,
      requestedTime: record.requestedTime,
      licensePlate: record.vehicle?.licensePlate,
    })}`
  )
  return Array.from(keys)
}

function posIdentityKeys(record: AppointmentRecord, invoiceNum: number): string[] {
  return [
    `invoice:${invoiceNum}`,
    `composite:${buildCompositeIdentity({
      storeId: record.storeId,
      customerName: record.customerName,
      requestedDate: record.requestedDate,
      requestedTime: record.requestedTime,
      licensePlate: record.vehicle?.licensePlate,
    })}`,
  ]
}

function mergeNotes(posNote?: string, localNote?: string): string | undefined {
  const primary = (posNote || '').trim()
  const secondary = (localNote || '').trim()
  if (!primary && !secondary) return undefined
  if (!primary) return secondary
  if (!secondary) return primary
  if (primary.toLowerCase().includes(secondary.toLowerCase())) return primary
  return `${primary}\n${secondary}`
}

function mapPosInvoiceToAppointment(invoice: Invoice): AppointmentRecord | null {
  const parsedDateTime = parseApptDateTime(invoice.ApptDateTime)
  if (!parsedDateTime) {
    return null
  }
  const bay = mapPosBay(invoice)
  const invoiceNum = Number(invoice.InvoiceNum || 0)
  const noteParts = [String(invoice.ApptText || '').trim(), String(invoice.TicketMemo || '').trim()].filter(Boolean)
  const localUpdatedAt = parseApptDateTime(invoice.LastEditedDateTime)

  return {
    id: `pos-${invoice.StoreNum || 0}-${invoiceNum}`,
    accountId: HITS_ACCOUNT,
    storeId: String(invoice.StoreNum || getSelectedStoreNum()),
    customerId: invoice.CustomerNum ? String(invoice.CustomerNum) : undefined,
    customerName: String(invoice.Name || '').trim() || `Ticket ${invoiceNum}`,
    customerPhone: String(invoice.Phone || '').trim() || undefined,
    customerEmail: String(invoice.Email || '').trim() || undefined,
    sendText: Boolean(String(invoice.Phone || '').trim()),
    sendEmail: Boolean(String(invoice.Email || '').trim()),
    recordType: 'confirmed',
    status: 'confirmed',
    requestedDate: formatDateLocal(parsedDateTime),
    requestedTime: formatTimeLocal(parsedDateTime),
    requestedDuration: parseDuration(invoice.ApptDuration),
    bayId: bay.bayId,
    bayName: bay.bayName,
    note: noteParts.join(' | ') || undefined,
    createdBy: String(invoice.LastEditedBy || 'POS').trim() || 'POS',
    createdAt: localUpdatedAt?.toISOString() || new Date().toISOString(),
    updatedAt: localUpdatedAt?.toISOString() || new Date().toISOString(),
    posFlag: true,
    apiSubmitted: true,
    integratorId: String(invoiceNum || ''),
    promisedAt: parsedDateTime.toISOString(),
    vehicle: {
      year: String(invoice.AutoYear || '').trim() || undefined,
      make: String(invoice.AutoMake || '').trim() || undefined,
      model: String(invoice.AutoModel || '').trim() || undefined,
      vin: String(invoice.VIN || '').trim() || undefined,
      licensePlate: String(invoice.AutoTag || '').trim() || undefined,
      tagState: String(invoice.AutoTagState || '').trim() || undefined,
    },
  }
}

function mergeLocalWithPos(
  localRecords: AppointmentRecord[],
  posMapped: Array<{ record: AppointmentRecord; invoiceNum: number }>
): AppointmentRecord[] {
  const posByKey = new Map<string, { record: AppointmentRecord; invoiceNum: number }>()
  for (const entry of posMapped) {
    for (const key of posIdentityKeys(entry.record, entry.invoiceNum)) {
      posByKey.set(key, entry)
    }
  }

  const merged: AppointmentRecord[] = []
  const consumedInvoices = new Set<number>()

  for (const local of localRecords) {
    if (local.recordType === 'schedule_note' || local.recordType === 'quick_note') {
      merged.push(local)
      continue
    }

    const match = localIdentityKeys(local)
      .map((key) => posByKey.get(key))
      .find(Boolean)

    if (!match) {
      merged.push(local)
      continue
    }

    consumedInvoices.add(match.invoiceNum)
    merged.push(
      normalizeRecord({
        ...match.record,
        id: local.id,
        createdAt: local.createdAt,
        updatedAt: new Date().toISOString(),
        note: mergeNotes(match.record.note, local.note),
        bayId: local.bayId ?? match.record.bayId,
        bayName: local.bayName ?? match.record.bayName,
      })
    )
  }

  for (const entry of posMapped) {
    if (consumedInvoices.has(entry.invoiceNum)) continue
    merged.push(normalizeRecord(entry.record))
  }

  return merged
}

function matchesSearch(record: AppointmentRecord, query: string): boolean {
  if (!query.trim()) return true
  const haystack = [
    record.customerName,
    record.bayName || '',
    record.vehicle?.year || '',
    record.vehicle?.make || '',
    record.vehicle?.model || '',
    record.requestedDate,
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(query.toLowerCase())
}

function overlaps(record: AppointmentRecord, date: string, startTime: string, duration: number): boolean {
  if (record.requestedDate !== date) {
    return false
  }
  const recordStart = toMinutes(record.requestedTime)
  const recordEnd = recordStart + record.requestedDuration
  const candidateStart = toMinutes(startTime)
  const candidateEnd = candidateStart + duration
  return recordStart < candidateEnd && candidateStart < recordEnd
}

function scheduleNoteBlocksBay(record: AppointmentRecord, bayId: string): boolean {
  if (record.recordType !== 'schedule_note') {
    return false
  }
  const blockerType = record.scheduleBlockerType || 'bay_blocker'
  if (blockerType === 'technician_unavailable') {
    return false
  }
  if (blockerType === 'shop_close') {
    return true
  }
  return (record.bayId || 'NB') === bayId
}

export function getAppointmentFiltersDefault(): AppointmentFilters {
  return { ...DEFAULT_FILTERS }
}

export async function listAppointments(
  filters: AppointmentFilters = DEFAULT_FILTERS,
  options: ListAppointmentsOptions = {}
): Promise<AppointmentListResult> {
  const effectiveFilters = { ...DEFAULT_FILTERS, ...filters }
  const localRecords = readModuleRecords().map(normalizeRecord)
  const requestedStartDate = options.requestedStartDate || effectiveFilters.dateFrom

  await ensurePosInvoiceCache({
    requestedStartDate,
    refresh: options.refreshPosCache,
  })

  const posMapped = posInvoiceCache
    .map((invoice) => {
      const mapped = mapPosInvoiceToAppointment(invoice)
      if (!mapped || !invoice.InvoiceNum) return null
      return { record: mapped, invoiceNum: Number(invoice.InvoiceNum) }
    })
    .filter((entry): entry is { record: AppointmentRecord; invoiceNum: number } => Boolean(entry))

  const colorOverrides = readAppointmentColorOverrides()
  const records = mergeLocalWithPos(localRecords, posMapped)
    .map((record) => {
      const override = colorOverrides[record.id]
      if (!override) return record
      return { ...record, colorOverride: override }
    })
    .filter((record) => matchesSearch(record, effectiveFilters.search))
    .filter((record) => isWithinRange(record.requestedDate, effectiveFilters.dateFrom, effectiveFilters.dateTo))
    .filter((record) =>
      effectiveFilters.bayIds.length === 0 ? true : effectiveFilters.bayIds.includes(record.bayId || 'NB')
    )
    .filter((record) =>
      effectiveFilters.recordTypes.length === 0 ? true : effectiveFilters.recordTypes.includes(record.recordType)
    )
    .filter((record) =>
      effectiveFilters.statuses.length === 0 ? true : effectiveFilters.statuses.includes(record.status)
    )
    .sort((a, b) => {
      if (a.requestedDate === b.requestedDate) {
        return toMinutes(a.requestedTime) - toMinutes(b.requestedTime)
      }
      return a.requestedDate.localeCompare(b.requestedDate)
    })

  return { records }
}

export async function createAppointmentRecord(
  draft: Omit<AppointmentRecord, 'id' | 'createdAt' | 'updatedAt'>,
  options: AppointmentMutationOptions = {}
): Promise<AppointmentRecord> {
  const nowIso = new Date().toISOString()
  const record: AppointmentRecord = normalizeRecord({
    ...draft,
    id: `appt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: nowIso,
    updatedAt: nowIso,
  })
  const records = readModuleRecords()
  records.push(record)
  let next: AppointmentRecord[] = records
  if (record.recordType === 'schedule_note' && record.scheduleBlockerType === 'shop_close') {
    next = reconcileBayBlockersAgainstShopCloses(records)
  } else if (record.recordType === 'schedule_note' && record.scheduleBlockerType === 'bay_blocker') {
    next = reconcileBayBlockersForDate(records, record.requestedDate)
  }
  writeModuleRecords(next)
  if (record.apiSubmitted !== true && canSendAppointmentNotification(record)) {
    const sent = await sendAppointmentNotificationForRecord(record)
    if (sent) {
      next = markRecordApiSubmitted(next, record.id)
      writeModuleRecords(next)
      const created = next.find((item) => item.id === record.id) || { ...record, apiSubmitted: true }
      if (options.syncIcal) {
        enqueueIcalUpsert(created)
      }
      return created
    }
  }
  if (options.syncIcal) {
    enqueueIcalUpsert(record)
  }
  return record
}

export async function updateAppointmentRecord(
  id: string,
  patch: Partial<AppointmentRecord>,
  options: AppointmentMutationOptions = {}
): Promise<AppointmentRecord | null> {
  const records = readModuleRecords()
  const index = records.findIndex((record) => record.id === id)
  if (index === -1) {
    return null
  }

  const previous = records[index]
  const updated = normalizeRecord({
    ...records[index],
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  })
  records[index] = updated

  const prevWasShopClose =
    previous.recordType === 'schedule_note' && previous.scheduleBlockerType === 'shop_close'
  const nowShopClose =
    updated.recordType === 'schedule_note' && updated.scheduleBlockerType === 'shop_close'

  let next: AppointmentRecord[] = records
  if (nowShopClose) {
    next = reconcileBayBlockersAgainstShopCloses(records)
  } else if (updated.recordType === 'schedule_note' && updated.scheduleBlockerType === 'bay_blocker') {
    next = reconcileBayBlockersForDate(records, updated.requestedDate)
  } else if (prevWasShopClose) {
    next = reconcileBayBlockersForDate(records, previous.requestedDate)
  }

  if (nowShopClose && prevWasShopClose && previous.requestedDate !== updated.requestedDate) {
    next = reconcileBayBlockersForDate(next, previous.requestedDate)
  }

  writeModuleRecords(next)
  if (updated.apiSubmitted !== true && canSendAppointmentNotification(updated)) {
    const sent = await sendAppointmentNotificationForRecord(updated)
    if (sent) {
      next = markRecordApiSubmitted(next, updated.id)
      writeModuleRecords(next)
      const synced = next.find((item) => item.id === id) || { ...updated, apiSubmitted: true }
      if (options.syncIcal) {
        enqueueIcalUpsert(synced)
      }
      return synced
    }
  }
  if (options.syncIcal) {
    enqueueIcalUpsert(updated)
  }
  return updated
}

export async function deleteAppointmentRecord(id: string, options: AppointmentMutationOptions = {}): Promise<boolean> {
  const records = readModuleRecords()
  const toDelete = records.find((record) => record.id === id)
  const next = records.filter((record) => record.id !== id)
  if (next.length === records.length) {
    return false
  }
  writeModuleRecords(next)
  if (toDelete && options.syncIcal) {
    enqueueIcalDelete(toDelete.id)
  }
  return true
}

export async function confirmAppointmentRecord(
  id: string,
  confirmedBy: string,
  options: AppointmentMutationOptions = {}
): Promise<AppointmentRecord | null> {
  return updateAppointmentRecord(id, {
    recordType: 'confirmed',
    status: 'confirmed',
    confirmedAt: new Date().toISOString(),
    confirmedBy,
    apiSubmitted: false,
  }, options)
}

export async function moveAppointmentRecord(
  id: string,
  options: { bayId?: string; requestedDate?: string; requestedTime?: string },
  mutationOptions: AppointmentMutationOptions = {},
  /** When the id is POS-only (not yet in module storage), materialize this row before patching. */
  sourceSnapshot?: AppointmentRecord
): Promise<AppointmentRecord | null> {
  let moduleRecords = readModuleRecords()
  if (moduleRecords.findIndex((r) => r.id === id) === -1 && sourceSnapshot && sourceSnapshot.id === id) {
    moduleRecords = [...moduleRecords, normalizeRecord({ ...sourceSnapshot })]
    writeModuleRecords(moduleRecords)
  }

  const patch: Partial<AppointmentRecord> = {}
  if (options.bayId !== undefined && options.bayId !== null) {
    patch.bayId = options.bayId
  }
  if (options.requestedDate) {
    patch.requestedDate = options.requestedDate
  }
  if (options.requestedTime) {
    patch.requestedTime = options.requestedTime
  }
  return updateAppointmentRecord(id, patch, mutationOptions)
}

export function getStatusColorToken(status: AppointmentStatus): string {
  switch (status) {
    case 'confirmed':
      return 'bg-blue-100 border-blue-300 text-blue-900'
    case 'unconfirmed':
    default:
      return 'bg-amber-100 border-amber-300 text-amber-900'
  }
}

export function getRecordTypeColorToken(type: AppointmentRecordType): string {
  return getResolvedRecordColorToken({ recordType: type })
}

export function getRecordTypeLabel(type: AppointmentRecordType): string {
  switch (type) {
    case 'quick_note':
      return 'Quick Note'
    case 'schedule_note':
      return 'Schedule Note'
    case 'booked_unconfirmed':
      return 'Booked'
    case 'confirmed':
      return 'Appointment'
    default:
      return type
  }
}

export function getRecordDisplayTitle(record: AppointmentRecord): string {
  const customerName = record.customerName?.trim()
  if (customerName) {
    return customerName
  }
  if (record.recordType === 'schedule_note') {
    return getScheduleBlockerTypeLabel(record.scheduleBlockerType)
  }
  return getRecordTypeLabel(record.recordType)
}

export function getScheduleBlockerTypeLabel(type?: ScheduleNoteBlockerType): string {
  switch (type) {
    case 'bay_blocker':
      return 'Bay Blocker'
    case 'shop_close':
      return 'Shop Close'
    case 'technician_unavailable':
      return 'Technician Unavailable'
    default:
      return 'Schedule Note'
  }
}

export function getAppointmentEndTime(record: AppointmentRecord): string {
  return addMinutes(record.requestedTime, record.requestedDuration)
}

export function isPastDue(record: AppointmentRecord): boolean {
  return dateAtTime(record.requestedDate, record.requestedTime).getTime() < Date.now()
}

export function getPromisedSoon(record: AppointmentRecord): boolean {
  if (!record.promisedAt) {
    return false
  }
  const minutesUntil = (new Date(record.promisedAt).getTime() - Date.now()) / 60000
  return minutesUntil > 0 && minutesUntil <= 30
}

export async function canDropInBaySlot(options: {
  bayId: string
  date: string
  requestedTime: string
  duration: number
  movingRecordId?: string
  targetRecordType?: AppointmentRecordType
}): Promise<boolean> {
  const targetRecordType = options.targetRecordType || 'confirmed'
  if (targetRecordType !== 'confirmed') {
    return true
  }
  const records = readModuleRecords().filter((record) => record.id !== options.movingRecordId)
  return !records.some(
    (record) =>
      record.recordType === 'schedule_note' &&
      scheduleNoteBlocksBay(record, options.bayId) &&
      overlaps(record, options.date, options.requestedTime, options.duration)
  )
}

export async function getIcalSyncInfo(recordId: string): Promise<ICalSyncInfo> {
  const raw = localStorage.getItem(MODULE_ICAL_STATUS_KEY)
  if (!raw) {
    return { status: 'not_synced' }
  }
  try {
    const map = JSON.parse(raw) as Record<string, ICalSyncInfo>
    return map[recordId] || { status: 'not_synced' }
  } catch {
    return { status: 'not_synced' }
  }
}

export async function setIcalSyncInfo(recordId: string, info: ICalSyncInfo): Promise<void> {
  const raw = localStorage.getItem(MODULE_ICAL_STATUS_KEY)
  const map = raw ? (JSON.parse(raw) as Record<string, ICalSyncInfo>) : {}
  map[recordId] = info
  localStorage.setItem(MODULE_ICAL_STATUS_KEY, JSON.stringify(map))
}

export function mapWidgetPayloadToUnconfirmedRecord(input: {
  customerName: string
  customerPhone?: string
  customerEmail?: string
  date: string
  time: string
  duration: number
  note?: string
  vehicle?: AppointmentRecord['vehicle']
}): Omit<AppointmentRecord, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    accountId: HITS_ACCOUNT,
    storeId: String(getSelectedStoreNum()),
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail,
    sendText: Boolean(input.customerPhone),
    sendEmail: Boolean(input.customerEmail),
    recordType: 'booked_unconfirmed',
    status: 'unconfirmed',
    requestedDate: input.date,
    requestedTime: input.time,
    requestedDuration: input.duration,
    bayId: 'NB',
    bayName: 'No Bay',
    note: input.note,
    createdBy: 'Widget',
    posFlag: false,
    apiSubmitted: true,
    vehicle: input.vehicle,
  }
}
