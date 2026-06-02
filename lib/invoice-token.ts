/**
 * Invoice View Token Utility
 * Encodes and decodes invoice view parameters (e, a, i) into a secure token
 */

export interface InvoiceTokenParams {
  e: string // Environment/type parameter
  a: string // Account number
  i: string // Invoice/ticket number
}

/**
 * Generate a secure token from invoice parameters
 * The token is base64 encoded JSON with a simple hash for validation.
 * Payload uses only (e, a, i) so the same invoice always produces the same token
 * for both advisor and customer views; use internal=true to distinguish advisor view.
 */
export function encodeInvoiceToken(params: InvoiceTokenParams): string {
  const payload = {
    e: params.e,
    a: params.a,
    i: params.i,
  }
  
  // Convert to JSON and encode to base64
  const jsonString = JSON.stringify(payload)
  const base64 = btoa(jsonString)
  
  // Create a simple hash for validation (in production, use a proper HMAC)
  // For now, we'll use a simple checksum approach
  const hash = simpleHash(base64)
  
  // Combine base64 and hash
  return `${base64}.${hash}`
}

/**
 * Decode and validate an invoice token
 * Returns null if token is invalid
 */
export function decodeInvoiceToken(token: string): InvoiceTokenParams | null {
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
    if (!payload.e || !payload.a || !payload.i) {
      return null
    }
    
    return {
      e: payload.e,
      a: payload.a,
      i: payload.i,
    }
  } catch (error) {
    console.error('Error decoding invoice token:', error)
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
 * Generate a customer view URL with encoded token
 */
export function generateCustomerViewUrl(params: InvoiceTokenParams, baseUrl?: string): string {
  const token = encodeInvoiceToken(params)
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${origin}/cv?inv=${encodeURIComponent(token)}`
}
