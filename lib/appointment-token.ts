/**
 * Appointment Reschedule Token Utility
 * Encodes and decodes appointment reschedule parameters into a secure token
 */

export interface AppointmentTokenParams {
  a: string // Account number
  i: string // Appointment ID
  d?: string // Date (YYYY-MM-DD) - optional for general reschedule link
  t?: string // Time (HH:MM or 'am-dropoff') - optional for general reschedule link
}

/**
 * Generate a secure token from appointment parameters
 * The token is base64 encoded JSON with a simple hash for validation
 */
export function encodeAppointmentToken(params: AppointmentTokenParams): string {
  // Create payload object
  const payload = {
    a: params.a,
    i: params.i,
    d: params.d || '',
    t: params.t || '',
    ts: Date.now(), // Timestamp for potential future expiration logic
  }
  
  // Convert to JSON and encode to base64
  const jsonString = JSON.stringify(payload)
  const base64 = btoa(jsonString)
  
  // Create a simple hash for validation (in production, use a proper HMAC)
  const hash = simpleHash(base64)
  
  // Combine base64 and hash
  return `${base64}.${hash}`
}

/**
 * Decode and validate an appointment token
 * Returns null if token is invalid
 */
export function decodeAppointmentToken(token: string): AppointmentTokenParams | null {
  try {
    // Split token into base64 and hash
    const parts = token.split('.')
    if (parts.length !== 2) {
      return null
    }
    
    const [base64, hash] = parts
    
    // Validate hash
    const expectedHash = simpleHash(base64)
    if (hash !== expectedHash) {
      console.error('Token hash validation failed')
      return null
    }
    
    // Decode base64
    const jsonString = atob(base64)
    const payload = JSON.parse(jsonString)
    
    // Validate required fields
    if (!payload.a || !payload.i) {
      return null
    }
    
    return {
      a: payload.a,
      i: payload.i,
      d: payload.d || undefined,
      t: payload.t || undefined,
    }
  } catch (error) {
    console.error('Error decoding appointment token:', error)
    return null
  }
}

/**
 * Simple hash function for token validation
 * In production, this should use a proper HMAC with a server-side secret
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  // Convert to positive hex string
  return Math.abs(hash).toString(16).padStart(8, '0')
}

/**
 * Generates a customer-facing reschedule URL with encoded token
 */
export function generateRescheduleUrl(params: AppointmentTokenParams, baseUrl?: string): string {
  const token = encodeAppointmentToken(params)
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  const url = new URL('/appointments/reschedule', origin)
  url.searchParams.set('token', token)
  
  // Add date and time as separate query params for easier access
  if (params.d) {
    url.searchParams.set('date', params.d)
  }
  if (params.t) {
    url.searchParams.set('time', params.t)
  }
  
  return url.toString()
}

/**
 * Validates appointment token (client-side validation)
 * In production, this should also validate server-side
 */
export function validateAppointmentToken(
  account: string,
  token: string
): { valid: boolean; error?: string; params?: AppointmentTokenParams } {
  const params = decodeAppointmentToken(token)
  
  if (!params) {
    return { valid: false, error: 'Invalid token format' }
  }
  
  if (params.a !== account) {
    return { valid: false, error: 'Invalid account number' }
  }
  
  if (!params.i) {
    return { valid: false, error: 'Missing appointment ID' }
  }
  
  return { valid: true, params }
}
