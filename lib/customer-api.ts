/**
 * Customer API utilities for customer lookup and form mapping
 * Reuses the API structure from tickets.ts
 */

// Use proxy in development to avoid CORS issues
const API_BASE_URL = import.meta.env.DEV 
  ? '/api/hits' 
  : 'https://aasys-dev.com/hits/Posv1/HitsAPI'
const INTEGRATOR_ID = '667'
const ACCOUNT = '92000'
const SIGNATURE = 'X/WzwXc6kho3elnaSnAJpHQvCoblKmZb0o2KcI6sci0='
const TIMESTAMP = '1706-01-17T09:00:00Z'

export interface CustomerVehicleLookupParams {
  searchKey: 'NAME' | 'PHONE' | 'TAG' | 'VIN' | 'EMAIL'
  searchValue: string
  exactMatch?: boolean
  storeNum?: number
  cutoffDate?: string
  maxCustomers?: number
  showInactive?: boolean
}

export interface CustomerVehicleLookupResponse {
  success: boolean
  data?: any
  error?: string
  customers?: any[]
}

interface HITSAPIRequest {
  integratorId: string
  account: string
  timestamp: string
  signature: string
  funcName: string
  payload: string
}

/**
 * Format payload string to match Postman's exact format
 */
function formatPayloadString(payload: any): string {
  if (typeof payload === 'string') {
    return payload
  }
  
  const compact = JSON.stringify(payload)
  return compact
    .replace(/":/g, '": ')      // Space after colon
    .replace(/,"/g, ', "')      // Space after comma  
    .replace(/{"/g, '{ "')      // Space after opening brace
    .replace(/"}/g, '" }')      // Space before closing brace
}

async function callHITSAPI(funcName: string, payload: any): Promise<any> {
  const payloadString = formatPayloadString(payload)
  
  const requestBody: HITSAPIRequest = {
    integratorId: INTEGRATOR_ID,
    account: ACCOUNT,
    timestamp: TIMESTAMP,
    signature: SIGNATURE,
    funcName,
    payload: payloadString
  }
  
  const requestBodyString = JSON.stringify(requestBody)
  
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: requestBodyString,
      credentials: 'omit',
      mode: 'cors',
    })

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status} ${response.statusText}`
      let errorDetails = null
      
      try {
        const text = await response.text()
        console.error('HITS API Error Response (text):', text)
        
        if (text) {
          errorDetails = text
          try {
            const json = JSON.parse(text)
            console.error('HITS API Error Response (JSON):', json)
            errorDetails = json
            errorMessage = json.error || json.message || json.Error || json.Message || errorMessage
          } catch (e) {
            errorMessage = text || errorMessage
          }
        }
      } catch (e) {
        console.error('Error reading response:', e)
      }
      
      throw new Error(errorMessage)
    }

    return await response.json()
  } catch (error) {
    console.error('HITS API Error:', error)
    throw error
  }
}

/**
 * Lookup customer and vehicle information
 */
export async function customerVehicleLookup(
  params: CustomerVehicleLookupParams
): Promise<CustomerVehicleLookupResponse> {
  try {
    const payload: Record<string, any> = {}
    payload['SearchKey'] = params.searchKey
    payload['SearchValue'] = params.searchValue
    payload['Store #'] = params.storeNum ?? 0
    payload['Cutoff Date'] = params.cutoffDate ?? '2020-01-01'
    payload['Max Customers'] = params.maxCustomers ?? 50
    payload['Show Inactive'] = params.showInactive ?? false
    
    if (params.exactMatch !== undefined && params.exactMatch !== false) {
      payload['Exact Match'] = params.exactMatch
    }

    const response = await callHITSAPI('CUSTOMER_VEHICLE_LOOKUP', payload)

    // Check for error code in response
    if (response.errorCode && response.errorCode !== 0) {
      const errorMsg = response.errorText || response.error || response.Error || 'Unknown error occurred'
      console.error('HITS API returned error code:', response.errorCode, 'Error text:', errorMsg)
      return {
        success: false,
        error: errorMsg,
      }
    }

    // Check if response has payload
    if (!response.payload) {
      console.error('HITS API response missing payload:', response)
      return {
        success: false,
        error: 'Invalid response from server. Please try again.',
      }
    }

    const customerRecords = response.payload?.CustomerRecords || response.payload?.customerRecords || []
    
    if (!customerRecords || customerRecords.length === 0) {
      return {
        success: false,
        error: 'No customers found matching your search criteria.',
      }
    }

    const customers = customerRecords.map((item: any) => item.CustomerRecord || item.customerRecord || item)

    return {
      success: true,
      data: response,
      customers,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to lookup customer',
    }
  }
}

/**
 * Check if customer has multiple options that need selection (phones/emails only)
 * Vehicle selection is now always shown, so we don't check for multiple vehicles here
 * @param customerRecord - The customer record to check
 */
export function needsSelection(customerRecord: any, searchKey?: 'NAME' | 'PHONE' | 'TAG' | 'VIN' | 'EMAIL'): boolean {
  const customer = customerRecord || {}
  const contacts = customer.Contacts || customer.contacts || []
  
  const phoneCount = contacts.filter((c: any) => c.Type === 'PHONE' || c.type === 'PHONE').length
  const emailCount = contacts.filter((c: any) => c.Type === 'EMAIL' || c.type === 'EMAIL').length
  
  // Only check for multiple phones/emails - vehicle selection is always shown
  return phoneCount > 1 || emailCount > 1
}

/**
 * Map API response to form data format
 * API structure: CustomerRecord with Vehicles[] and Contacts[]
 * This is used when there's only one option for each, or after selection
 */
export function mapCustomerDataToForm(customerRecord: any, selectedPhone?: string, selectedEmail?: string, selectedVehicleIndex?: number): any {
  const customer = customerRecord || {}
  const contacts = customer.Contacts || customer.contacts || []
  const vehicles = customer.Vehicles || customer.vehicles || []
  
  // Get selected or default phone
  let phoneContact
  if (selectedPhone) {
    phoneContact = contacts.find((c: any) => (c.Value || c.value) === selectedPhone && (c.Type === 'PHONE' || c.type === 'PHONE'))
  }
  if (!phoneContact) {
    phoneContact = contacts.find((c: any) => 
      (c.Type === 'PHONE' || c.type === 'PHONE') && 
      (c.Priority === 'Primary' || c.priority === 'Primary')
    ) || contacts.find((c: any) => c.Type === 'PHONE' || c.type === 'PHONE')
  }
  
  // Get selected or default email
  let emailContact
  if (selectedEmail) {
    emailContact = contacts.find((c: any) => (c.Value || c.value) === selectedEmail && (c.Type === 'EMAIL' || c.type === 'EMAIL'))
  }
  if (!emailContact) {
    emailContact = contacts.find((c: any) => 
      (c.Type === 'EMAIL' || c.type === 'EMAIL') && 
      (c.Priority === 'Primary' || c.priority === 'Primary')
    ) || contacts.find((c: any) => c.Type === 'EMAIL' || c.type === 'EMAIL')
  }
  
  // Get selected or default vehicle
  const vehicleIndex = selectedVehicleIndex !== undefined ? selectedVehicleIndex : 0
  const vehicle = vehicles[vehicleIndex] || {}

  // Parse customer name into first and last name
  const fullName = customer.Name || customer.name || ''
  const nameParts = fullName.split(' ')
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''

  return {
    name: fullName,
    custNum: customer.CustomerNum || customer.customerNum || customer.CustomerNumber || customer.customerNumber || 0,
    custFirstName: firstName,
    custLastName: lastName,
    phone: phoneContact?.Value || phoneContact?.value || '',
    email: emailContact?.Value || emailContact?.value || '',
    address: {
      street: customer.Address1 || customer.address1 || customer.Address?.Street || customer.address?.street || '',
      apt: customer.Address2 || customer.address2 || customer.Address?.Apt || customer.address?.apt || '',
      city: customer.City || customer.city || '',
      state: '',
      zip: customer.Zip || customer.zip || '',
    },
    vehicle: {
      licensePlate: vehicle.Tag || vehicle.tag || '',
      state: vehicle.State || vehicle.state || '',
      year: vehicle.Year ? String(vehicle.Year) : (vehicle.year ? String(vehicle.year) : ''),
      make: vehicle.Make || vehicle.make || '',
      model: vehicle.Model || vehicle.model || '',
      vin: vehicle.VIN || vehicle.vin || '',
      mileage: vehicle.Mileage ? String(vehicle.Mileage) : (vehicle.mileage ? String(vehicle.mileage) : ''),
    },
    // Preserve original customer record for API calls
    _customerRecord: customer,
  }
}
