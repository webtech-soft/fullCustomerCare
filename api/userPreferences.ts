import type { 
  UserTicketPreferences, 
  FilterPreset, 
  TicketFilters,
  StylePreferences
} from '@/types/ticket'
import {
  DEFAULT_STYLE_PREFERENCES,
  DEFAULT_FILTERS
} from '@/types/ticket'

const API_BASE_URL = import.meta.env.DEV 
  ? '/api/preferences' 
  : 'https://www.aasys-portal.com/api/preferences'

export interface UserPreferencesResponse {
  success: boolean
  data?: UserTicketPreferences
  error?: string
}

export interface FilterPresetResponse {
  success: boolean
  preset?: FilterPreset
  error?: string
}

export interface DeletePresetResponse {
  success: boolean
  error?: string
}

/**
 * Fetch user preferences from the API
 */
export async function fetchUserPreferences(
  signal?: AbortSignal
): Promise<UserPreferencesResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/tickets`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      signal,
    })

    if (!response.ok) {
      // Return default preferences if endpoint not found or unauthorized
      if (response.status === 404 || response.status === 401) {
        return {
          success: true,
          data: getDefaultUserPreferences(),
        }
      }
      
      const errorText = await response.text().catch(() => 'Unknown error')
      return {
        success: false,
        error: `Failed to fetch preferences: ${response.status} - ${errorText}`,
      }
    }

    const data = await response.json()
    return {
      success: true,
      data: data.preferences || data,
    }
  } catch (error: any) {
    // Return default preferences on network error (API might not exist yet)
    if (error.name === 'AbortError') {
      return { success: false, error: 'Request aborted' }
    }
    
    console.warn('User preferences API not available, using defaults:', error.message)
    return {
      success: true,
      data: getDefaultUserPreferences(),
    }
  }
}

/**
 * Save user preferences to the API
 */
export async function saveUserPreferences(
  preferences: UserTicketPreferences,
  signal?: AbortSignal
): Promise<UserPreferencesResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/tickets`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ preferences }),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      return {
        success: false,
        error: `Failed to save preferences: ${response.status} - ${errorText}`,
      }
    }

    const data = await response.json()
    return {
      success: true,
      data: data.preferences || preferences,
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { success: false, error: 'Request aborted' }
    }
    
    // Store locally if API not available
    console.warn('User preferences API not available, storing locally:', error.message)
    savePreferencesToLocalStorage(preferences)
    return {
      success: true,
      data: preferences,
    }
  }
}

/**
 * Create a new filter preset
 */
export async function createFilterPreset(
  preset: Omit<FilterPreset, 'id'>,
  signal?: AbortSignal
): Promise<FilterPresetResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/tickets/presets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(preset),
      signal,
    })

    if (!response.ok) {
      // Backend not ready or error: create locally so UI still persists to localStorage
      const errorText = await response.text().catch(() => 'Unknown error')
      console.warn('Filter preset API not available, creating locally:', response.status, errorText)
      const newPreset: FilterPreset = {
        ...preset,
        id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      }
      return { success: true, preset: newPreset }
    }

    const data = await response.json()
    return {
      success: true,
      preset: data.preset || data,
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { success: false, error: 'Request aborted' }
    }
    
    // Create locally if API not available
    console.warn('Filter preset API not available, creating locally:', error.message)
    const newPreset: FilterPreset = {
      ...preset,
      id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }
    return {
      success: true,
      preset: newPreset,
    }
  }
}

/**
 * Update an existing filter preset
 */
export async function updateFilterPreset(
  preset: FilterPreset,
  signal?: AbortSignal
): Promise<FilterPresetResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/tickets/presets/${encodeURIComponent(String(preset.id))}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(preset),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      return {
        success: false,
        error: `Failed to update preset: ${response.status} - ${errorText}`,
      }
    }

    const data = await response.json()
    return {
      success: true,
      preset: data.preset || preset,
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { success: false, error: 'Request aborted' }
    }
    
    return {
      success: true,
      preset,
    }
  }
}

/**
 * Delete a filter preset
 */
export async function deleteFilterPreset(
  presetId: string | number,
  signal?: AbortSignal
): Promise<DeletePresetResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/tickets/presets/${encodeURIComponent(String(presetId))}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      return {
        success: false,
        error: `Failed to delete preset: ${response.status} - ${errorText}`,
      }
    }

    return { success: true }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { success: false, error: 'Request aborted' }
    }
    
    // Treat as success if API not available
    return { success: true }
  }
}

// Local storage keys
const PREFS_STORAGE_KEY = 'user_ticket_preferences'

/**
 * Get default user preferences
 */
export function getDefaultUserPreferences(): UserTicketPreferences {
  // Try to load from localStorage first
  const stored = loadPreferencesFromLocalStorage()
  if (stored) return stored
  
  return {
    stylePreferences: { ...DEFAULT_STYLE_PREFERENCES },
    filterPresets: [],
    lastUsedFilters: { ...DEFAULT_FILTERS },
  }
}

/**
 * Save preferences to localStorage as fallback
 */
export function savePreferencesToLocalStorage(preferences: UserTicketPreferences): void {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(preferences))
  } catch (error) {
    console.warn('Failed to save preferences to localStorage:', error)
  }
}

/**
 * Load preferences from localStorage
 */
export function loadPreferencesFromLocalStorage(): UserTicketPreferences | null {
  try {
    const stored = localStorage.getItem(PREFS_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.warn('Failed to load preferences from localStorage:', error)
  }
  return null
}

/**
 * Clear preferences from localStorage
 */
export function clearPreferencesFromLocalStorage(): void {
  try {
    localStorage.removeItem(PREFS_STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear preferences from localStorage:', error)
  }
}
