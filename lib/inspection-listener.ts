// lib/inspection-listener.ts
export interface InspectionUpdate {
  type:
    | 'INSPECTION_CREATED'
    | 'INSPECTION_UPDATED'
    | 'INSPECTION_COMPLETED'
    | 'INSPECTION_SENT'
    | 'INSPECTION_CUSTOMER_VIEW_OPENED'
  ticketNumber: string | number
  inspectionId?: string
  /** Present on INSPECTION_SENT when DVI knows the sender */
  sentBy?: string
}

/**
 * Sets up a listener for messages from the DVI Editor.
 * @param callback Function to call when an inspection update message is received.
 * @returns A cleanup function to remove the event listener.
 */
export function setupInspectionListener(
  callback: (update: InspectionUpdate) => void
) {
  const handleMessage = (event: MessageEvent) => {
    if (
      event.data &&
      (event.data.type === 'INSPECTION_CREATED' ||
        event.data.type === 'INSPECTION_UPDATED' ||
        event.data.type === 'INSPECTION_COMPLETED' ||
        event.data.type === 'INSPECTION_SENT' ||
        event.data.type === 'INSPECTION_CUSTOMER_VIEW_OPENED')
    ) {
      callback(event.data as InspectionUpdate)
    }
  }

  window.addEventListener("message", handleMessage)

  return () => {
    window.removeEventListener("message", handleMessage)
  }
}

