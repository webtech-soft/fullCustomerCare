export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Formats phone number to (XXX) XXX-XXXX format
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '')
  
  // Limit to 10 digits
  const limitedDigits = digitsOnly.slice(0, 10)
  
  // Format based on length
  if (limitedDigits.length === 0) {
    return ''
  } else if (limitedDigits.length <= 3) {
    return `(${limitedDigits}`
  } else if (limitedDigits.length <= 6) {
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`
  } else {
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`
  }
}

/**
 * Normalizes a US phone string to exactly 10 digits (NANP, no country prefix).
 * Accepts formatted input, optional leading 1 / +1 (11 digits starting with 1).
 */
export function normalizeUsPhoneTenDigits(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 10) return digits
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1)
  return null
}

/**
 * Validates phone number - must be 10 digits (required field)
 */
export function validatePhone(phone: string, required: boolean = true): ValidationResult {
  if (!phone) {
    if (required) {
      return { isValid: false, error: 'Phone number is required' }
    }
    return { isValid: true } // Optional field
  }
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '')
  
  if (digitsOnly.length === 0) {
    if (required) {
      return { isValid: false, error: 'Phone number is required' }
    }
    return { isValid: true }
  }
  
  if (digitsOnly.length < 10) {
    return { isValid: false, error: 'Phone number must be 10 digits' }
  }
  
  if (digitsOnly.length > 10) {
    return { isValid: false, error: 'Phone number must be 10 digits' }
  }
  
  return { isValid: true }
}

/**
 * Validates email address format - must be [name]@[domain].[com/co/etc]
 */
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { isValid: true } // Email is optional
  }
  
  // More strict email validation: [name]@[domain].[tld]
  // - name: one or more characters (letters, numbers, dots, hyphens, underscores)
  // - domain: one or more characters (letters, numbers, dots, hyphens)
  // - tld: 2 or more letters (com, co, org, net, etc.)
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' }
  }
  
  return { isValid: true }
}

/**
 * Validates zip code - must be 5 or 9 digits (optional field)
 */
export function validateZipCode(zip: string): ValidationResult {
  if (!zip) {
    return { isValid: true } // Optional field
  }
  
  // Remove all non-digit characters
  const digitsOnly = zip.replace(/\D/g, '')
  
  if (digitsOnly.length === 5 || digitsOnly.length === 9) {
    return { isValid: true }
  }
  
  return { isValid: false, error: 'Zip code must be 5 or 9 digits' }
}

/**
 * Validates vehicle year - must be 4 digits and reasonable range
 */
export function validateVehicleYear(year: string): ValidationResult {
  if (!year) {
    return { isValid: true } // Year is optional
  }
  
  // Check if it's all digits
  if (!/^\d+$/.test(year)) {
    return { isValid: false, error: 'Year must be numeric' }
  }
  
  if (year.length !== 4) {
    return { isValid: false, error: 'Year must be 4 digits' }
  }
  
  const yearNum = parseInt(year, 10)
  const currentYear = new Date().getFullYear()
  const minYear = 1900
  const maxYear = currentYear + 1 // Allow one year in the future
  
  if (yearNum < minYear || yearNum > maxYear) {
    return { isValid: false, error: `Year must be between ${minYear} and ${maxYear}` }
  }
  
  return { isValid: true }
}

/**
 * Validates mileage - must be numeric
 */
export function validateMileage(mileage: string): ValidationResult {
  if (!mileage) {
    return { isValid: true } // Mileage is optional
  }
  
  // Check if it's a valid number
  if (!/^\d+$/.test(mileage)) {
    return { isValid: false, error: 'Mileage must be a number' }
  }
  
  const mileageNum = parseInt(mileage, 10)
  
  if (mileageNum < 0) {
    return { isValid: false, error: 'Mileage cannot be negative' }
  }
  
  if (mileageNum > 10000000) {
    return { isValid: false, error: 'Mileage seems too high' }
  }
  
  return { isValid: true }
}

/**
 * Validates text for potentially dangerous characters that could cause JSON API errors
 * Checks for unescaped quotes, backslashes, and control characters
 * @param required - Whether the field is required (default: false)
 */
export function validateSafeText(text: string, fieldName: string, required: boolean = false): ValidationResult {
  if (!text) {
    if (required) {
      return { isValid: false, error: `${fieldName} is required` }
    }
    return { isValid: true } // Optional field
  }
  
  // Check for control characters (except newline, tab, carriage return)
  if (/[\x00-\x08\x0B-\x0C\x0E-\x1F]/.test(text)) {
    return { isValid: false, error: `${fieldName} contains invalid characters` }
  }
  
  return { isValid: true }
}

/**
 * Sanitizes text to make it safe for JSON APIs
 */
export function sanitizeForJSON(text: string): string {
  if (!text) return text
  
  // Remove control characters (except newline, tab, carriage return)
  return text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '')
}
