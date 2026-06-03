import { confirmAppointmentRecord, moveAppointmentRecord } from '@/api/appointments'
import { sendHitsNotification, type HitsNotificationPayload } from '@/api/tickets'
import { getSelectedStoreNum } from '@/composables/useStoreContext'

function chatApiBase(): string {
  const raw = import.meta.env.VITE_CHAT_API_BASE_URL || ''
  return String(raw).replace(/\/+$/, '')
}

function staffKey(): string {
  return (import.meta.env.VITE_APPOINTMENT_RESCHEDULE_STAFF_KEY || '').trim()
}

export interface RescheduleOfferSlot {
  date: string
  time: string
}

export interface MintRescheduleOfferResult {
  success: true
  token: string
  expiresAt: string
}

export interface MintRescheduleOfferError {
  success: false
  error: string
}

export async function mintAppointmentRescheduleOffer(params: {
  recordId: string
  storeId: string
  shopName?: string
  bayId: string
  durationMinutes: number
  slots: RescheduleOfferSlot[]
  customerName?: string
  customerPhone?: string
}): Promise<MintRescheduleOfferResult | MintRescheduleOfferError> {
  const key = staffKey()
  if (!key) {
    return { success: false, error: 'VITE_APPOINTMENT_RESCHEDULE_STAFF_KEY is not set' }
  }
  const base = chatApiBase()
  if (!base) {
    return { success: false, error: 'VITE_CHAT_API_BASE_URL is not set' }
  }
  try {
    const res = await fetch(`${base}/appointment-reschedule/offers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-appointment-staff-key': key,
      },
      body: JSON.stringify({
        recordId: params.recordId,
        storeId: params.storeId,
        shopName: params.shopName,
        bayId: params.bayId,
        durationMinutes: params.durationMinutes,
        slots: params.slots,
        customerName: params.customerName,
        customerPhone: params.customerPhone,
      }),
    })
    const text = await res.text()
    let data: { success?: boolean; token?: string; expiresAt?: string; error?: string } = {}
    try {
      data = JSON.parse(text) as typeof data
    } catch {
      /* ignore */
    }
    if (!res.ok || !data.success || !data.token) {
      return {
        success: false,
        error: (typeof data.error === 'string' && data.error) || text || `Mint failed (${res.status})`,
      }
    }
    return {
      success: true,
      token: data.token,
      expiresAt: data.expiresAt || '',
    }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Network error',
    }
  }
}

export interface PublicRescheduleOffer {
  customerName: string
  slots: RescheduleOfferSlot[]
  status: string
  chosenSlot: RescheduleOfferSlot | null
  durationMinutes?: number
  shopName?: string
  expiresAt: string
}

export async function fetchAppointmentRescheduleOffer(
  token: string
): Promise<{ success: true; offer: PublicRescheduleOffer } | { success: false; error: string }> {
  const base = chatApiBase()
  if (!base) {
    return { success: false, error: 'VITE_CHAT_API_BASE_URL is not set' }
  }
  try {
    const res = await fetch(`${base}/appointment-reschedule/offers/${encodeURIComponent(token)}`, {
      headers: { Accept: 'application/json' },
    })
    const text = await res.text()
    let data: {
      success?: boolean
      customerName?: string
      slots?: RescheduleOfferSlot[]
      status?: string
      chosenSlot?: RescheduleOfferSlot | null
      durationMinutes?: number
      shopName?: string
      expiresAt?: string
      error?: string
    } = {}
    try {
      data = JSON.parse(text) as typeof data
    } catch {
      /* ignore */
    }
    if (!res.ok || !data.success || !Array.isArray(data.slots)) {
      return {
        success: false,
        error: (typeof data.error === 'string' && data.error) || text || `Load failed (${res.status})`,
      }
    }
    return {
      success: true,
      offer: {
        customerName: data.customerName || '',
        slots: data.slots,
        status: data.status || 'pending',
        chosenSlot: data.chosenSlot ?? null,
        durationMinutes: Number.isFinite(data.durationMinutes) ? Number(data.durationMinutes) : undefined,
        shopName: typeof data.shopName === 'string' ? data.shopName : undefined,
        expiresAt: data.expiresAt || '',
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function fetchAppointmentRescheduleOfferStatus(token: string): Promise<
  | {
      success: true
      status: string
      chosenSlot: RescheduleOfferSlot | null
      expiresAt: string
    }
  | {
      success: false
      error: string
      notFound: boolean
    }
> {
  const base = chatApiBase()
  if (!base) {
    return { success: false, error: 'VITE_CHAT_API_BASE_URL is not set', notFound: false }
  }
  try {
    const res = await fetch(`${base}/appointment-reschedule/offers/${encodeURIComponent(token)}`, {
      headers: { Accept: 'application/json' },
    })
    const text = await res.text()
    let data: {
      success?: boolean
      status?: string
      chosenSlot?: RescheduleOfferSlot | null
      expiresAt?: string
      error?: string
    } = {}
    try {
      data = JSON.parse(text) as typeof data
    } catch {
      /* ignore */
    }
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: (typeof data.error === 'string' && data.error) || text || `Load failed (${res.status})`,
        notFound: res.status === 404,
      }
    }
    return {
      success: true,
      status: data.status || 'pending',
      chosenSlot: data.chosenSlot ?? null,
      expiresAt: data.expiresAt || '',
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error', notFound: false }
  }
}

export async function postAppointmentRescheduleSelect(
  token: string,
  slot: RescheduleOfferSlot
): Promise<{ success: true; chosenSlot?: RescheduleOfferSlot } | { success: false; error: string }> {
  const base = chatApiBase()
  if (!base) {
    return { success: false, error: 'VITE_CHAT_API_BASE_URL is not set' }
  }
  try {
    const res = await fetch(`${base}/appointment-reschedule/offers/${encodeURIComponent(token)}/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ date: slot.date, time: slot.time }),
    })
    const text = await res.text()
    let data: { success?: boolean; chosenSlot?: RescheduleOfferSlot; error?: string } = {}
    try {
      data = JSON.parse(text) as typeof data
    } catch {
      /* ignore */
    }
    if (!res.ok || data.success === false) {
      return {
        success: false,
        error: (typeof data.error === 'string' && data.error) || text || `Select failed (${res.status})`,
      }
    }
    return {
      success: true,
      chosenSlot: data.chosenSlot,
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export interface SyncRescheduleItem {
  token: string
  recordId: string
  storeId: string
  bayId: string
  date: string
  time: string
}

export async function fetchRescheduleSyncPending(): Promise<
  { success: true; items: SyncRescheduleItem[] } | { success: false; error: string }
> {
  const key = staffKey()
  if (!key) {
    return { success: false, error: 'VITE_APPOINTMENT_RESCHEDULE_STAFF_KEY is not set' }
  }
  const base = chatApiBase()
  if (!base) {
    return { success: false, error: 'VITE_CHAT_API_BASE_URL is not set' }
  }
  const storeId = String(getSelectedStoreNum())
  try {
    const url = new URL(`${base}/appointment-reschedule/sync`, window.location.origin)
    url.searchParams.set('storeId', storeId)
    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'x-appointment-staff-key': key,
      },
    })
    const text = await res.text()
    let data: { success?: boolean; items?: SyncRescheduleItem[]; error?: string } = {}
    try {
      data = JSON.parse(text) as typeof data
    } catch {
      /* ignore */
    }
    if (!res.ok || !data.success || !Array.isArray(data.items)) {
      return {
        success: false,
        error: (typeof data.error === 'string' && data.error) || text || `Sync failed (${res.status})`,
      }
    }
    return { success: true, items: data.items }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function ackRescheduleOfferOnServer(token: string): Promise<boolean> {
  const key = staffKey()
  const base = chatApiBase()
  if (!key || !base) return false
  try {
    const res = await fetch(`${base}/appointment-reschedule/sync/ack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-appointment-staff-key': key,
      },
      body: JSON.stringify({ token }),
    })
    const data = await res.json().catch(() => ({}))
    return res.ok && data.success === true
  } catch {
    return false
  }
}

/**
 * Pull customer reschedule choices from sms-server and apply `moveAppointmentRecord` + ack.
 */
export async function applyPendingRescheduleOffersFromServer(): Promise<{
  applied: number
  errors: string[]
}> {
  const errors: string[] = []
  const sync = await fetchRescheduleSyncPending()
  if (!sync.success) {
    if (sync.error.includes('not set')) {
      return { applied: 0, errors: [] }
    }
    return { applied: 0, errors: [sync.error] }
  }
  let applied = 0
  for (const item of sync.items) {
    const moved = await moveAppointmentRecord(item.recordId, {
      bayId: item.bayId,
      requestedDate: item.date,
      requestedTime: item.time,
    })
    if (!moved) {
      errors.push(`Could not move record ${item.recordId}`)
      continue
    }
    const confirmed = await confirmAppointmentRecord(item.recordId, 'Customer Reschedule Link')
    if (!confirmed) {
      errors.push(`Moved ${item.recordId} but failed to confirm it`)
      continue
    }
    const [firstName = '', ...lastParts] = String(confirmed.customerName || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
    const [year, month, day] = confirmed.requestedDate.split('-')
    const [hours, minutes] = confirmed.requestedTime.split(':')
    const storeNumFromRecord = Number(confirmed.storeId)
    const apptDate = year && month && day ? `${month}/${day}/${year}` : undefined
    const apptTime = Number(hours) * 100 + Number(minutes)
    const payload: HitsNotificationPayload = {
      handlerId: 1,
      notificationType: 'Online Appointment',
      ticketNum: 0,
      storeNum: Number.isFinite(storeNumFromRecord) ? storeNumFromRecord : Number(item.storeId),
      custFirstName: firstName,
      custLastName: lastParts.join(' '),
      custEmail: confirmed.customerEmail || '',
      custPhone: confirmed.customerPhone || '',
      custMobile: confirmed.customerPhone || '',
      apptDate,
      apptTime: Number.isFinite(apptTime) ? apptTime : undefined,
      apptDescription: confirmed.note || '',
      apptCode: '',
      apptVehStatus: 65,
      ApptVehicleStatus: 65,
      apptCancel: '',
      comment: confirmed.note || '',
      vehTag: confirmed.vehicle?.licensePlate || '',
      vehMake: confirmed.vehicle?.make || '',
      vehModel: confirmed.vehicle?.model || '',
      vehYear: confirmed.vehicle?.year || '',
      vehVin: confirmed.vehicle?.vin || '',
    }
    const notification = await sendHitsNotification(payload)
    if (!notification.success) {
      errors.push(`Confirmed ${item.recordId} but notification failed: ${notification.error || 'Unknown error'}`)
    }
    const acked = await ackRescheduleOfferOnServer(item.token)
    if (!acked) {
      errors.push(`Moved ${item.recordId} but failed to ack token ${item.token}`)
    }
    applied += 1
  }
  return { applied, errors }
}
