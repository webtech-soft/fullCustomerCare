/**
 * Cross-project navigation utilities
 * Handles navigation between Customer Care, DVI Editor, and Check In projects
 */

// Configuration for local development ports
const PROJECT_URLS = {
  DVI_EDITOR: import.meta.env.VITE_DVI_EDITOR_URL || "http://localhost:3000",
  CHECK_IN: import.meta.env.VITE_CHECK_IN_URL || "http://localhost:3001",
} as const

export interface NavigationParams {
  ticketId?: number | string
  ticketNumber?: string
  vehicleId?: string
  [key: string]: string | number | undefined
}

/**
 * Navigate to DVI Editor with ticket data
 * DVI Editor accepts:
 * - ?inspectionId=INS-123456 - Opens specific inspection
 * - ?ticketNumber=RO-456789 - Finds existing inspection for ticket or creates new one
 */
export function navigateToDVIEditor(
  ticket: { inspectionId?: string; ticketNumber: number | string },
  openInNewTab = true
) {
  const baseUrl = PROJECT_URLS.DVI_EDITOR
  let url: URL

  try {
    if (baseUrl.startsWith('/')) {
      url = new URL(baseUrl, window.location.origin)
    } else {
      url = new URL(baseUrl)
    }
  } catch (error) {
    console.error("Invalid DVI_EDITOR_URL:", baseUrl, error)
    url = new URL("http://localhost:3000")
  }

  if (ticket.inspectionId) {
    url.searchParams.append("inspectionId", ticket.inspectionId)
  } else {
    url.searchParams.append("ticketNumber", String(ticket.ticketNumber))
  }

  if (openInNewTab) {
    window.open(url.toString(), "_blank")
  } else {
    window.location.href = url.toString()
  }
}

/**
 * Navigate to Check In with ticket data
 */
export function navigateToCheckIn(params: NavigationParams, openInNewTab = false) {
  const baseUrl = PROJECT_URLS.CHECK_IN
  let url: URL

  try {
    if (baseUrl.startsWith('/')) {
      url = new URL(`${baseUrl}/check-in`, window.location.origin)
    } else {
      url = new URL(`${baseUrl}/check-in`)
    }
  } catch (error) {
    console.error("Invalid CHECK_IN_URL:", baseUrl, error)
    url = new URL("http://localhost:3001/check-in")
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, String(value))
    }
  })

  if (openInNewTab) {
    window.open(url.toString(), "_blank")
  } else {
    window.location.href = url.toString()
  }
}

