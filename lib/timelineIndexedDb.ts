import type {
  TimelineEventIdbCanonicalRow,
  TimelineEventInsert,
  TimelineEventRow,
} from '@/types/timeline'

const DB_NAME = 'customer-care-timeline'
const DB_VERSION = 2
const MIGRATION_KEY_V2 = 'timeline_idb_schema_v2_migrated'

const STORE_TIMELINE_EVENTS = 'timeline_events'

type InvoiceViewStatus = {
  isViewed: boolean
  firstViewed: number
  lastActive: number
  token?: string
}

type InspectionViewStatus = {
  isViewed: boolean
  firstViewed: number
  lastActive: number
  token?: string
}

type TicketSentEvent = { timestamp: number; sentBy?: string }
type InspectionSentEvent = { timestamp: number; sentBy?: string; inspectionId?: string }
type VehicleStatusChange = { status: string; timestamp: number }

type WorkApprovalItemV1 = {
  key: string
  lineNum: number
  description: string
  amount: number
  approvedAtIso: string
  approvedDate: string
  approvedTime: string
  approverIp: string
  signatureDataUrl: string
  verbalApproval?: boolean
  approverName?: string
}

type WorkApprovalRecordV1 = {
  version: 1
  ticketNumber: number
  items: WorkApprovalItemV1[]
  updatedAtIso: string
  notificationSent?: boolean
}

export type TimelineEventIdbRow = TimelineEventIdbCanonicalRow

const TIMELINE_TYPE_VEHICLE_STATUS = 1
const TIMELINE_TYPE_SENT = 2
const TIMELINE_TYPE_VIEWED = 3
const TIMELINE_TYPE_APPROVAL = 4
const TIMELINE_TYPE_INSPECTION_SENT = 5
const TIMELINE_TYPE_INSPECTION_VIEWED = 6

const invoiceViewCache = new Map<number, InvoiceViewStatus>()
const inspectionViewCache = new Map<number, InspectionViewStatus>()
const ticketSentCache = new Map<number, TicketSentEvent[]>()
const inspectionSentCache = new Map<number, InspectionSentEvent[]>()
const vehicleStatusCache = new Map<number, VehicleStatusChange[]>()
const workApprovalsCache = new Map<number, WorkApprovalRecordV1>()

let initPromise: Promise<void> | null = null

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined'
}

function parseTicketNumberFromKey(key: string, prefix: string): number | null {
  if (!key.startsWith(prefix)) return null
  const n = Number.parseInt(key.slice(prefix.length), 10)
  return Number.isFinite(n) ? n : null
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function toIso(value?: number | string | null): string {
  if (typeof value === 'string' && value.trim().length > 0) return value
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString()
  return new Date().toISOString()
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function defaultTimelineRowBase(ticketNum: number, type: number): TimelineEventIdbRow {
  const nowIso = new Date().toISOString()
  return {
    ticket_num: ticketNum,
    type,
    username: null,
    datetime: nowIso,
    date_time: null,
    ticket_total: null,
    vehicle_sts: null,
    ip: null,
    approval_total: null,
    approval_name: null,
    approval_details: null,
    approval_signature: null,
    hide: 0,
    notification_physical_attempt_cnt: 0,
    notification_sms_attempt_cnt: 0,
    last_attempt_dt: null,
    last_attempt_tm: null,
    est_amt: null,
    est_auto_send: null,
    store: null,
    account: null,
    attr_link: null,
    attr_token: null,
    attr_event_ts: null,
    attr_payload_json: null,
    created_at: nowIso,
    updated_at: nowIso,
  }
}

export function toTimelineIdbRow(input: TimelineEventInsert): TimelineEventIdbRow {
  const base = defaultTimelineRowBase(input.TicketNum, input.Type)
  return {
    ...base,
    datetime: toIso(input.Datetime),
    ticket_total: toNumberOrNull(input.TicketTotal),
    vehicle_sts: toNumberOrNull(input.VehicleStatus),
    ip: input.IPaddress ?? null,
    approval_total: toNumberOrNull(input.ApprovalTotal),
    approval_name: input.ApprovalName ?? null,
    approval_details: input.ApprovalDetails ?? null,
    approval_signature: input.ApprovalSignature ?? null,
    hide: Number.isFinite(input.Hide) ? input.Hide : 0,
    username: input.User ?? null,
    attr_link: input.ApprovalLink ?? input.attrLink ?? null,
  }
}

function normalizeTimelineIdbRow(value: unknown): TimelineEventIdbRow | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Partial<TimelineEventIdbRow> & Record<string, unknown>

  const ticketNum = toNumberOrNull(row.ticket_num ?? row.TicketNum)
  const type = toNumberOrNull(row.type ?? row.Type)
  if (ticketNum == null || type == null) return null

  const base = defaultTimelineRowBase(ticketNum, type)
  return {
    ...base,
    id: toNumberOrNull(row.id) ?? undefined,
    username: typeof row.username === 'string' ? row.username : typeof row.User === 'string' ? row.User : null,
    datetime: toIso((row.datetime as string | undefined) ?? (row.Datetime as string | undefined)),
    date_time: typeof row.date_time === 'string' ? row.date_time : null,
    ticket_total: toNumberOrNull(row.ticket_total ?? row.TicketTotal),
    vehicle_sts: toNumberOrNull(row.vehicle_sts ?? row.VehicleStatus),
    ip: typeof row.ip === 'string' ? row.ip : typeof row.IPaddress === 'string' ? row.IPaddress : null,
    approval_total: toNumberOrNull(row.approval_total ?? row.ApprovalTotal),
    approval_name:
      typeof row.approval_name === 'string' ? row.approval_name : typeof row.ApprovalName === 'string' ? row.ApprovalName : null,
    approval_details:
      typeof row.approval_details === 'string'
        ? row.approval_details
        : typeof row.ApprovalDetails === 'string'
          ? row.ApprovalDetails
          : null,
    approval_signature:
      typeof row.approval_signature === 'string'
        ? row.approval_signature
        : typeof row.ApprovalSignature === 'string'
          ? row.ApprovalSignature
          : null,
    hide: toNumberOrNull(row.hide ?? row.Hide) ?? 0,
    notification_physical_attempt_cnt: toNumberOrNull(row.notification_physical_attempt_cnt) ?? 0,
    notification_sms_attempt_cnt: toNumberOrNull(row.notification_sms_attempt_cnt) ?? 0,
    last_attempt_dt: typeof row.last_attempt_dt === 'string' ? row.last_attempt_dt : null,
    last_attempt_tm: typeof row.last_attempt_tm === 'string' ? row.last_attempt_tm : null,
    est_amt: toNumberOrNull(row.est_amt),
    est_auto_send: toNumberOrNull(row.est_auto_send),
    store: toNumberOrNull(row.store),
    account: toNumberOrNull(row.account),
    attr_link:
      typeof row.attr_link === 'string'
        ? row.attr_link
        : typeof row.attrLink === 'string'
          ? row.attrLink
          : typeof row.ApprovalLink === 'string'
            ? row.ApprovalLink
            : null,
    attr_token: typeof row.attr_token === 'string' ? row.attr_token : null,
    attr_event_ts: toNumberOrNull(row.attr_event_ts),
    attr_payload_json: typeof row.attr_payload_json === 'string' ? row.attr_payload_json : null,
    created_at: toIso(row.created_at as string | undefined),
    updated_at: toIso(row.updated_at as string | undefined),
  }
}

function fromTimelineIdbRow(row: TimelineEventIdbRow): TimelineEventRow {
  return {
    id: row.id,
    TicketNum: row.ticket_num,
    Type: row.type as TimelineEventRow['Type'],
    User: row.username,
    Datetime: row.datetime,
    TicketTotal: row.ticket_total,
    VehicleStatus: row.vehicle_sts,
    IPaddress: row.ip,
    ApprovalName: row.approval_name,
    ApprovalTotal: row.approval_total,
    ApprovalDetails: row.approval_details,
    ApprovalSignature: row.approval_signature,
    ApprovalLink: row.attr_link,
    attrLink: row.attr_link,
    Hide: row.hide,
  }
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function openDb(createIfMissing = true): Promise<IDBDatabase | null> {
  if (!hasIndexedDb()) return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      if (!createIfMissing) return
      const db = req.result

      const events = db.objectStoreNames.contains(STORE_TIMELINE_EVENTS)
        ? req.transaction?.objectStore(STORE_TIMELINE_EVENTS)
        : db.createObjectStore(STORE_TIMELINE_EVENTS, { keyPath: 'id', autoIncrement: true })
      if (events && !events.indexNames.contains('by_ticket_num')) events.createIndex('by_ticket_num', 'ticket_num')
      if (events && !events.indexNames.contains('by_type')) events.createIndex('by_type', 'type')
      if (events && !events.indexNames.contains('by_ticket_num_type')) {
        events.createIndex('by_ticket_num_type', ['ticket_num', 'type'])
      }
      if (events && !events.indexNames.contains('by_datetime')) events.createIndex('by_datetime', 'datetime')
      if (events && !events.indexNames.contains('by_ticket_num_datetime')) {
        events.createIndex('by_ticket_num_datetime', ['ticket_num', 'datetime'])
      }
      if (events && !events.indexNames.contains('by_last_attempt_dt_tm')) {
        events.createIndex('by_last_attempt_dt_tm', ['last_attempt_dt', 'last_attempt_tm'])
      }
      if (events && !events.indexNames.contains('by_notification_sms_attempt_cnt')) {
        events.createIndex('by_notification_sms_attempt_cnt', 'notification_sms_attempt_cnt')
      }
      if (events && !events.indexNames.contains('by_notification_physical_attempt_cnt')) {
        events.createIndex('by_notification_physical_attempt_cnt', 'notification_physical_attempt_cnt')
      }
    }
  })
}

function rebuildDerivedCaches(rows: TimelineEventIdbRow[]): void {
  invoiceViewCache.clear()
  inspectionViewCache.clear()
  ticketSentCache.clear()
  inspectionSentCache.clear()
  vehicleStatusCache.clear()
  workApprovalsCache.clear()

  const approvalsByTicket = new Map<number, WorkApprovalItemV1[]>()
  const latestApprovalIsoByTicket = new Map<number, string>()

  rows.forEach((row) => {
    const ticketNumber = row.ticket_num
    switch (row.type) {
      case TIMELINE_TYPE_VIEWED: {
        const payload = safeParse<{ isViewed?: boolean; firstViewed?: number; lastActive?: number; token?: string }>(row.attr_payload_json)
        const firstViewed = payload?.firstViewed ?? Date.parse(row.datetime)
        const lastActive = payload?.lastActive ?? Date.parse(row.date_time ?? row.datetime)
        if (Number.isFinite(firstViewed) && Number.isFinite(lastActive)) {
          invoiceViewCache.set(ticketNumber, {
            isViewed: payload?.isViewed ?? true,
            firstViewed,
            lastActive,
            token: payload?.token ?? row.attr_token ?? undefined,
          })
        }
        break
      }
      case TIMELINE_TYPE_INSPECTION_VIEWED: {
        const payload = safeParse<{ isViewed?: boolean; firstViewed?: number; lastActive?: number; token?: string }>(row.attr_payload_json)
        const firstViewed = payload?.firstViewed ?? Date.parse(row.datetime)
        const lastActive = payload?.lastActive ?? Date.parse(row.date_time ?? row.datetime)
        if (Number.isFinite(firstViewed) && Number.isFinite(lastActive)) {
          inspectionViewCache.set(ticketNumber, {
            isViewed: payload?.isViewed ?? true,
            firstViewed,
            lastActive,
            token: payload?.token ?? row.attr_token ?? undefined,
          })
        }
        break
      }
      case TIMELINE_TYPE_SENT: {
        const ts = row.attr_event_ts ?? Date.parse(row.datetime)
        const events = ticketSentCache.get(ticketNumber) ?? []
        if (Number.isFinite(ts)) {
          events.push({
            timestamp: ts,
            sentBy: row.username ?? undefined,
          })
          ticketSentCache.set(ticketNumber, events)
        }
        break
      }
      case TIMELINE_TYPE_INSPECTION_SENT: {
        const ts = row.attr_event_ts ?? Date.parse(row.datetime)
        const payload = safeParse<{ inspectionId?: string }>(row.attr_payload_json)
        const events = inspectionSentCache.get(ticketNumber) ?? []
        if (Number.isFinite(ts)) {
          events.push({
            timestamp: ts,
            sentBy: row.username ?? undefined,
            inspectionId: payload?.inspectionId,
          })
          inspectionSentCache.set(ticketNumber, events)
        }
        break
      }
      case TIMELINE_TYPE_VEHICLE_STATUS: {
        const ts = row.attr_event_ts ?? Date.parse(row.datetime)
        if (Number.isFinite(ts) && row.approval_details) {
          const events = vehicleStatusCache.get(ticketNumber) ?? []
          events.push({ status: row.approval_details, timestamp: ts })
          vehicleStatusCache.set(ticketNumber, events)
        }
        break
      }
      case TIMELINE_TYPE_APPROVAL: {
        const payload = safeParse<{ items?: WorkApprovalItemV1[]; updatedAtIso?: string; notificationSent?: boolean }>(row.attr_payload_json)
        const items = Array.isArray(payload?.items) ? payload.items : []
        if (items.length > 0) {
          approvalsByTicket.set(ticketNumber, items)
          latestApprovalIsoByTicket.set(ticketNumber, payload?.updatedAtIso ?? row.updated_at)
        }
        break
      }
      default:
        break
    }
  })

  ticketSentCache.forEach((events, ticketNumber) => {
    events.sort((a, b) => a.timestamp - b.timestamp)
    ticketSentCache.set(ticketNumber, events)
  })
  inspectionSentCache.forEach((events, ticketNumber) => {
    events.sort((a, b) => a.timestamp - b.timestamp)
    inspectionSentCache.set(ticketNumber, events)
  })
  vehicleStatusCache.forEach((events, ticketNumber) => {
    events.sort((a, b) => a.timestamp - b.timestamp)
    vehicleStatusCache.set(ticketNumber, events)
  })

  approvalsByTicket.forEach((items, ticketNumber) => {
    const updatedAtIso = latestApprovalIsoByTicket.get(ticketNumber) ?? new Date().toISOString()
    workApprovalsCache.set(ticketNumber, {
      version: 1,
      ticketNumber,
      items,
      updatedAtIso,
      notificationSent: false,
    })
  })
}

async function loadAllTimelineRows(db: IDBDatabase): Promise<TimelineEventIdbRow[]> {
  const tx = db.transaction(STORE_TIMELINE_EVENTS, 'readonly')
  const store = tx.objectStore(STORE_TIMELINE_EVENTS)
  const rawRows = await requestToPromise(store.getAll() as IDBRequest<unknown[]>)
  return rawRows.map((r) => normalizeTimelineIdbRow(r)).filter((r): r is TimelineEventIdbRow => r !== null)
}

async function replaceTimelineRowsForTicketType(
  db: IDBDatabase,
  ticketNumber: number,
  type: number,
  rows: TimelineEventIdbRow[]
): Promise<void> {
  const tx = db.transaction(STORE_TIMELINE_EVENTS, 'readwrite')
  const store = tx.objectStore(STORE_TIMELINE_EVENTS)
  const index = store.index('by_ticket_num_type')
  const existing = await requestToPromise(
    index.getAllKeys(IDBKeyRange.only([ticketNumber, type])) as IDBRequest<IDBValidKey[]>
  )
  await Promise.all(existing.map((key) => requestToPromise(store.delete(key))))
  await Promise.all(rows.map((row) => requestToPromise(store.add(row))))
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

async function migrateLocalStorageAndLegacyStores(db: IDBDatabase): Promise<void> {
  if (typeof window === 'undefined' || window.localStorage.getItem(MIGRATION_KEY_V2) === '1') return
  const localStorage = window.localStorage
  const migratedRows: TimelineEventIdbRow[] = []

  const pushRow = (row: TimelineEventIdbRow) => {
    migratedRows.push({ ...row, created_at: row.created_at ?? new Date().toISOString(), updated_at: new Date().toISOString() })
  }

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key) continue
    const raw = localStorage.getItem(key)
    if (!raw) continue

    const invoiceTicket = parseTicketNumberFromKey(key, 'invoice_view_status_')
    if (invoiceTicket != null) {
      const parsed = safeParse<InvoiceViewStatus>(raw)
      if (parsed && typeof parsed.firstViewed === 'number') {
        pushRow({
          ...defaultTimelineRowBase(invoiceTicket, TIMELINE_TYPE_VIEWED),
          datetime: toIso(parsed.firstViewed),
          date_time: toIso(parsed.lastActive),
          attr_token: parsed.token ?? null,
          attr_event_ts: parsed.firstViewed,
          attr_payload_json: JSON.stringify(parsed),
        })
      }
      continue
    }

    const inspectionViewTicket = parseTicketNumberFromKey(key, 'inspection_view_status_')
    if (inspectionViewTicket != null) {
      const parsed = safeParse<InspectionViewStatus>(raw)
      if (parsed && typeof parsed.firstViewed === 'number') {
        pushRow({
          ...defaultTimelineRowBase(inspectionViewTicket, TIMELINE_TYPE_INSPECTION_VIEWED),
          datetime: toIso(parsed.firstViewed),
          date_time: toIso(parsed.lastActive),
          attr_token: parsed.token ?? null,
          attr_event_ts: parsed.firstViewed,
          attr_payload_json: JSON.stringify(parsed),
        })
      }
      continue
    }

    const ticketSentTicket = parseTicketNumberFromKey(key, 'ticket_sent_')
    if (ticketSentTicket != null) {
      const parsed = safeParse<unknown>(raw)
      const events = Array.isArray(parsed)
        ? parsed.filter((e): e is TicketSentEvent => typeof e === 'object' && e !== null && typeof (e as TicketSentEvent).timestamp === 'number')
        : []
      events.forEach((event) => {
        pushRow({
          ...defaultTimelineRowBase(ticketSentTicket, TIMELINE_TYPE_SENT),
          datetime: toIso(event.timestamp),
          attr_event_ts: event.timestamp,
          username: event.sentBy ?? null,
        })
      })
      continue
    }

    const inspectionSentTicket = parseTicketNumberFromKey(key, 'inspection_sent_')
    if (inspectionSentTicket != null) {
      const parsed = safeParse<unknown>(raw)
      const events = Array.isArray(parsed)
        ? parsed.filter((e): e is InspectionSentEvent => typeof e === 'object' && e !== null && typeof (e as InspectionSentEvent).timestamp === 'number')
        : []
      events.forEach((event) => {
        pushRow({
          ...defaultTimelineRowBase(inspectionSentTicket, TIMELINE_TYPE_INSPECTION_SENT),
          datetime: toIso(event.timestamp),
          attr_event_ts: event.timestamp,
          username: event.sentBy ?? null,
          attr_payload_json: JSON.stringify({ inspectionId: event.inspectionId }),
        })
      })
      continue
    }

    const vehicleTicket = parseTicketNumberFromKey(key, 'vehicle_status_changes_')
    if (vehicleTicket != null) {
      const parsed = safeParse<unknown>(raw)
      const events = Array.isArray(parsed)
        ? parsed.filter(
            (e): e is VehicleStatusChange =>
              typeof e === 'object' &&
              e !== null &&
              typeof (e as VehicleStatusChange).status === 'string' &&
              typeof (e as VehicleStatusChange).timestamp === 'number'
          )
        : []
      events.forEach((event) => {
        pushRow({
          ...defaultTimelineRowBase(vehicleTicket, TIMELINE_TYPE_VEHICLE_STATUS),
          datetime: toIso(event.timestamp),
          attr_event_ts: event.timestamp,
          approval_details: event.status,
        })
      })
      continue
    }

    if (key === 'work_approvals_v1') {
      const parsed = safeParse<Record<string, WorkApprovalRecordV1>>(raw) || {}
      Object.entries(parsed).forEach(([ticketKey, record]) => {
        const ticketNumber = Number.parseInt(ticketKey, 10)
        if (!Number.isFinite(ticketNumber) || !record || !Array.isArray(record.items)) return
        const latest = [...record.items].sort((a, b) => Date.parse(a.approvedAtIso) - Date.parse(b.approvedAtIso)).at(-1)
        pushRow({
          ...defaultTimelineRowBase(ticketNumber, TIMELINE_TYPE_APPROVAL),
          datetime: latest?.approvedAtIso ?? record.updatedAtIso,
          approval_total: record.items.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0),
          approval_name: latest?.approverName ?? null,
          approval_details: latest?.description ?? null,
          approval_signature: latest?.signatureDataUrl ?? null,
          attr_event_ts: Date.parse(latest?.approvedAtIso ?? record.updatedAtIso),
          attr_payload_json: JSON.stringify(record),
        })
      })
    }
  }

  const existingRows = await loadAllTimelineRows(db)
  const mergedRows = [...existingRows]
  migratedRows.forEach((row) => {
    const duplicate = mergedRows.some(
      (existing) => existing.ticket_num === row.ticket_num && existing.type === row.type && existing.datetime === row.datetime
    )
    if (!duplicate) mergedRows.push(row)
  })

  const tx = db.transaction(STORE_TIMELINE_EVENTS, 'readwrite')
  const store = tx.objectStore(STORE_TIMELINE_EVENTS)
  const allKeys = await requestToPromise(store.getAllKeys() as IDBRequest<IDBValidKey[]>)
  await Promise.all(allKeys.map((key) => requestToPromise(store.delete(key))))
  await Promise.all(mergedRows.map((row) => requestToPromise(store.add(row))))
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
  localStorage.setItem(MIGRATION_KEY_V2, '1')
}

export async function initTimelineIndexedDb(): Promise<void> {
  if (initPromise) return initPromise
  initPromise = (async () => {
    const db = await openDb(true)
    if (!db) return
    try {
      await migrateLocalStorageAndLegacyStores(db)
      const rows = await loadAllTimelineRows(db)
      rebuildDerivedCaches(rows)
    } finally {
      db.close()
    }
  })()
  return initPromise
}

async function addTimelineRows(rows: TimelineEventIdbRow[]): Promise<void> {
  const db = await openDb(true)
  if (!db) return
  try {
    const tx = db.transaction(STORE_TIMELINE_EVENTS, 'readwrite')
    const store = tx.objectStore(STORE_TIMELINE_EVENTS)
    await Promise.all(rows.map((row) => requestToPromise(store.add(row))))
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

async function replaceRowsForTicketType(ticketNumber: number, type: number, rows: TimelineEventIdbRow[]): Promise<void> {
  const db = await openDb(true)
  if (!db) return
  try {
    await replaceTimelineRowsForTicketType(db, ticketNumber, type, rows)
  } finally {
    db.close()
  }
}

function emitTimelineStorageChanged(kind: string, ticketNumber: number): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('timeline-idb-changed', {
      detail: { kind, ticketNumber },
    })
  )
}

export function getInvoiceViewStatusCached(ticketNumber: number): InvoiceViewStatus | null {
  return invoiceViewCache.get(ticketNumber) ?? null
}

export function listInvoiceViewedTicketNumbers(): number[] {
  return Array.from(invoiceViewCache.keys())
}

export async function setInvoiceViewStatus(ticketNumber: number, status: InvoiceViewStatus): Promise<void> {
  invoiceViewCache.set(ticketNumber, status)
  await replaceRowsForTicketType(ticketNumber, TIMELINE_TYPE_VIEWED, [
    {
      ...defaultTimelineRowBase(ticketNumber, TIMELINE_TYPE_VIEWED),
      datetime: toIso(status.firstViewed),
      date_time: toIso(status.lastActive),
      attr_event_ts: status.firstViewed,
      attr_token: status.token ?? null,
      attr_payload_json: JSON.stringify(status),
    },
  ])
  emitTimelineStorageChanged('invoice_view_status', ticketNumber)
}

export async function clearInvoiceViewStatus(ticketNumber: number): Promise<void> {
  invoiceViewCache.delete(ticketNumber)
  await replaceRowsForTicketType(ticketNumber, TIMELINE_TYPE_VIEWED, [])
  emitTimelineStorageChanged('invoice_view_status', ticketNumber)
}

export function getInspectionViewStatusCached(ticketNumber: number): InspectionViewStatus | null {
  return inspectionViewCache.get(ticketNumber) ?? null
}

export function listInspectionViewedTicketNumbers(): number[] {
  return Array.from(inspectionViewCache.keys())
}

export async function setInspectionViewStatus(ticketNumber: number, status: InspectionViewStatus): Promise<void> {
  inspectionViewCache.set(ticketNumber, status)
  await replaceRowsForTicketType(ticketNumber, TIMELINE_TYPE_INSPECTION_VIEWED, [
    {
      ...defaultTimelineRowBase(ticketNumber, TIMELINE_TYPE_INSPECTION_VIEWED),
      datetime: toIso(status.firstViewed),
      date_time: toIso(status.lastActive),
      attr_event_ts: status.firstViewed,
      attr_token: status.token ?? null,
      attr_payload_json: JSON.stringify(status),
    },
  ])
  emitTimelineStorageChanged('inspection_view_status', ticketNumber)
}

export async function clearInspectionViewStatus(ticketNumber: number): Promise<void> {
  inspectionViewCache.delete(ticketNumber)
  await replaceRowsForTicketType(ticketNumber, TIMELINE_TYPE_INSPECTION_VIEWED, [])
  emitTimelineStorageChanged('inspection_view_status', ticketNumber)
}

export function getTicketSentEventsCached(ticketNumber: number): TicketSentEvent[] {
  return [...(ticketSentCache.get(ticketNumber) ?? [])]
}

export function listTicketSentTicketNumbers(): number[] {
  return Array.from(ticketSentCache.keys())
}

export async function setTicketSentEvents(ticketNumber: number, events: TicketSentEvent[]): Promise<void> {
  ticketSentCache.set(ticketNumber, events)
  await replaceRowsForTicketType(
    ticketNumber,
    TIMELINE_TYPE_SENT,
    events.map((event) => ({
      ...defaultTimelineRowBase(ticketNumber, TIMELINE_TYPE_SENT),
      datetime: toIso(event.timestamp),
      attr_event_ts: event.timestamp,
      username: event.sentBy ?? null,
    }))
  )
  emitTimelineStorageChanged('ticket_sent', ticketNumber)
}

export function getInspectionSentEventsCached(ticketNumber: number): InspectionSentEvent[] {
  return [...(inspectionSentCache.get(ticketNumber) ?? [])]
}

export function listInspectionSentTicketNumbers(): number[] {
  return Array.from(inspectionSentCache.keys())
}

export async function setInspectionSentEvents(ticketNumber: number, events: InspectionSentEvent[]): Promise<void> {
  inspectionSentCache.set(ticketNumber, events)
  await replaceRowsForTicketType(
    ticketNumber,
    TIMELINE_TYPE_INSPECTION_SENT,
    events.map((event) => ({
      ...defaultTimelineRowBase(ticketNumber, TIMELINE_TYPE_INSPECTION_SENT),
      datetime: toIso(event.timestamp),
      attr_event_ts: event.timestamp,
      username: event.sentBy ?? null,
      attr_payload_json: JSON.stringify({ inspectionId: event.inspectionId }),
    }))
  )
  emitTimelineStorageChanged('inspection_sent', ticketNumber)
}

export function getVehicleStatusChangesCached(ticketNumber: number): VehicleStatusChange[] {
  return [...(vehicleStatusCache.get(ticketNumber) ?? [])]
}

export async function setVehicleStatusChanges(ticketNumber: number, events: VehicleStatusChange[]): Promise<void> {
  vehicleStatusCache.set(ticketNumber, events)
  await replaceRowsForTicketType(
    ticketNumber,
    TIMELINE_TYPE_VEHICLE_STATUS,
    events.map((event) => ({
      ...defaultTimelineRowBase(ticketNumber, TIMELINE_TYPE_VEHICLE_STATUS),
      datetime: toIso(event.timestamp),
      attr_event_ts: event.timestamp,
      approval_details: event.status,
    }))
  )
  emitTimelineStorageChanged('vehicle_status_changes', ticketNumber)
}

export function getWorkApprovalCached(ticketNumber: number): WorkApprovalRecordV1 | null {
  const record = workApprovalsCache.get(ticketNumber)
  return record ? { ...record, items: [...record.items] } : null
}

export function listWorkApprovalTicketNumbers(): number[] {
  return Array.from(workApprovalsCache.keys())
}

export async function setWorkApprovalRecord(ticketNumber: number, record: WorkApprovalRecordV1): Promise<void> {
  workApprovalsCache.set(ticketNumber, record)
  const latest = [...record.items].sort((a, b) => Date.parse(a.approvedAtIso) - Date.parse(b.approvedAtIso)).at(-1)
  await replaceRowsForTicketType(ticketNumber, TIMELINE_TYPE_APPROVAL, [
    {
      ...defaultTimelineRowBase(ticketNumber, TIMELINE_TYPE_APPROVAL),
      datetime: latest?.approvedAtIso ?? record.updatedAtIso,
      approval_total: record.items.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0),
      approval_name: latest?.approverName ?? null,
      approval_details: latest?.description ?? null,
      approval_signature: latest?.signatureDataUrl ?? null,
      attr_event_ts: Date.parse(latest?.approvedAtIso ?? record.updatedAtIso),
      attr_payload_json: JSON.stringify(record),
    },
  ])
  emitTimelineStorageChanged('work_approval', ticketNumber)
}

export async function saveTimelineEventLocal(row: TimelineEventInsert): Promise<void> {
  await addTimelineRows([toTimelineIdbRow(row)])
}

export async function getTimelineEventsForTicket(ticketNumber: number): Promise<TimelineEventRow[]> {
  const db = await openDb(true)
  if (!db) return []
  try {
    const tx = db.transaction(STORE_TIMELINE_EVENTS, 'readonly')
    const store = tx.objectStore(STORE_TIMELINE_EVENTS)
    const index = store.index('by_ticket_num')
    const rows = await requestToPromise(
      index.getAll(IDBKeyRange.only(ticketNumber)) as IDBRequest<unknown[]>
    )
    return rows
      .map((row) => normalizeTimelineIdbRow(row))
      .filter((row): row is TimelineEventIdbRow => row !== null)
      .sort((a, b) => String(a.datetime).localeCompare(String(b.datetime)))
      .map(fromTimelineIdbRow)
  } finally {
    db.close()
  }
}

