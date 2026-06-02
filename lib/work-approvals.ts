import {
  getWorkApprovalCached,
  listWorkApprovalTicketNumbers,
  setWorkApprovalRecord,
} from '@/lib/timelineIndexedDb'

export const WORK_APPROVALS_STORAGE_KEY = 'work_approvals_v1' as const

export interface WorkApprovalItemV1 {
  key: string
  lineNum: number
  description: string
  amount: number
  approvedAtIso: string
  approvedDate: string // MM/DD/YYYY
  approvedTime: string // localized time (e.g. "3:04 PM")
  approverIp: string // 'unknown' for now
  signatureDataUrl: string // PNG data URL
  /** When true, approval was made verbally (advisor flow); signature may be empty. */
  verbalApproval?: boolean
  /** Name of person who recorded the verbal approval; used when verbalApproval is true. */
  approverName?: string
}

export interface WorkApprovalRecordV1 {
  version: 1
  ticketNumber: number
  items: WorkApprovalItemV1[]
  updatedAtIso: string
  notificationSent?: boolean // Track if notification has been sent for this ticket
}

type WorkApprovalsStoreV1 = Record<string, WorkApprovalRecordV1>

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function isRecordV1(value: unknown): value is WorkApprovalRecordV1 {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<WorkApprovalRecordV1>
  return v.version === 1 && typeof v.ticketNumber === 'number' && Array.isArray(v.items)
}

export function getAllWorkApprovals(): WorkApprovalsStoreV1 {
  const normalized: WorkApprovalsStoreV1 = {}
  for (const ticketNumber of listWorkApprovalTicketNumbers()) {
    const record = getWorkApprovalCached(ticketNumber)
    if (record && isRecordV1(record)) {
      normalized[String(ticketNumber)] = record
    }
  }
  return normalized
}

export function getWorkApproval(ticketNumber: number): WorkApprovalRecordV1 | null {
  const store = getAllWorkApprovals()
  const record = store[String(ticketNumber)]
  return record ?? null
}

export function getWorkApprovalItem(
  ticketNumber: number,
  itemKey: string
): WorkApprovalItemV1 | null {
  const record = getWorkApproval(ticketNumber)
  if (!record) return null
  return record.items.find((i) => i.key === itemKey) ?? null
}

export function isItemApproved(ticketNumber: number, itemKey: string): boolean {
  return getWorkApprovalItem(ticketNumber, itemKey) !== null
}

export function upsertWorkApprovalItems(
  ticketNumber: number,
  itemsToUpsert: WorkApprovalItemV1[],
  nowIso: string = new Date().toISOString()
): WorkApprovalRecordV1 {
  if (typeof window === 'undefined') {
    return {
      version: 1,
      ticketNumber,
      items: [...itemsToUpsert],
      updatedAtIso: nowIso,
    }
  }

  const store = getAllWorkApprovals()
  const existing = store[String(ticketNumber)]

  const byKey = new Map<string, WorkApprovalItemV1>()
  for (const item of existing?.items ?? []) {
    byKey.set(item.key, item)
  }
  for (const item of itemsToUpsert) {
    byKey.set(item.key, item)
  }

  const record: WorkApprovalRecordV1 = {
    version: 1,
    ticketNumber,
    items: Array.from(byKey.values()),
    updatedAtIso: nowIso,
    // Preserve notificationSent flag from existing record
    notificationSent: existing?.notificationSent ?? false,
  }

  void setWorkApprovalRecord(ticketNumber, record)
  return record
}

/**
 * Marks the notification as sent for a ticket
 */
export function markNotificationSent(ticketNumber: number): void {
  if (typeof window === 'undefined') return

  const store = getAllWorkApprovals()
  const existing = store[String(ticketNumber)]
  if (!existing) return

  const updated: WorkApprovalRecordV1 = {
    ...existing,
    notificationSent: true,
  }

  void setWorkApprovalRecord(ticketNumber, updated)
}

export function getApprovedTotal(ticketNumber: number): number {
  const record = getWorkApproval(ticketNumber)
  if (!record) return 0
  return record.items.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0)
}

export function getAllWorkApprovalTicketNumbers(): number[] {
  return listWorkApprovalTicketNumbers()
}

