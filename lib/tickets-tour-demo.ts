import type { ChatMessage } from '@/types/chat'
import type { DetailRow, Invoice, InvoiceDetailResponse, Ticket } from '@/types/ticket'
import type { TicketTimelineData } from '@/composables/useTicketTimelineData'
import type { WorkApprovalRecordV1 } from '@/lib/work-approvals'

/** Lightweight SVG “signature” so the Approvals tab shows a scribble without storing a PNG. */
const TOUR_DEMO_SIGNATURE_DATA_URL =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80" viewBox="0 0 240 80"><rect fill="#fff" width="240" height="80"/><path fill="none" stroke="#1e293b" stroke-width="2" stroke-linecap="round" d="M18 52 Q55 22 95 48 T178 38 Q198 52 222 32"/></svg>',
  )

/** Sentinel ticket numbers for tour-only demo rows (avoid real API collisions). */
export const TICKETS_TOUR_DEMO_DRAWER_TICKET_NUMBER = 990001

const DEMO_BASE = 990000

/** Same treatment as live “new activity” row actions (chat / approvals notifications). */
export const TOUR_DEMO_ROW_ACTION_ACCENT_CLASS =
  'bg-brand-accent hover:bg-brand-accent-hover text-white border-brand-accent'

/**
 * Advanced tour final step: Approvals on the spotlight row.
 * Same fill as live signed-work state ({@link TOUR_DEMO_ROW_ACTION_ACCENT_CLASS}); Chat on that row uses pulse for contrast.
 */
export const TOUR_DEMO_APPROVALS_SOLID_GREEN_CLASS = TOUR_DEMO_ROW_ACTION_ACCENT_CLASS

/**
 * Advanced tour “action signals” step: the **visually first** table row (default sort: ticket # desc)
 * shows yellow Inspection, pulsing Chat, solid green Approvals—not `tickets[0]`, which sorts last.
 */
export function applyAdvActionSignalsDemoRowPatch(tickets: Ticket[]): Ticket[] {
  if (tickets.length === 0) return tickets
  let spotlightIdx = 0
  let maxTn = tickets[0]!.ticketNumber
  for (let i = 1; i < tickets.length; i++) {
    const tn = tickets[i]!.ticketNumber
    if (tn > maxTn) {
      maxTn = tn
      spotlightIdx = i
    }
  }
  return tickets.map((t, i) =>
    i !== spotlightIdx
      ? t
      : {
          ...t,
          inspectionStatus: 'incomplete',
          inspectionId: `INS-tour-adv-signals-${t.ticketNumber}`,
          tourDemoRowActionAccent: 'chat',
          tourDemoChatActionPulse: true,
          tourDemoApprovalsSolidGreen: true,
          tourDemoAdvActionSignalsAnchor: true,
          tourDemoInvoiceViewed: undefined,
        },
  )
}

export function isTicketsTourDemoTicketNumber(n: number | null | undefined): boolean {
  if (n == null || !Number.isFinite(n)) return false
  return n >= DEMO_BASE && n <= DEMO_BASE + 20
}

/** Sample SMS thread for the Advanced tour Chat step (history fetch is skipped). */
export function buildTicketsTourDemoChatThread(phone: string): ChatMessage[] {
  const p = phone.trim().length > 0 ? phone.trim() : '(555) 010-0001'
  return [
    {
      id: 'tour-chat-demo-1',
      phone: p,
      direction: 'inbound',
      body: 'Hi — any update on my vehicle?',
      sentAt: '2026-04-10T15:02:00.000Z',
      status: 'delivered',
    },
    {
      id: 'tour-chat-demo-2',
      phone: p,
      direction: 'outbound',
      body:
        "We're finishing the inspection. I'll text again when your advisor has the estimate ready.",
      sentAt: '2026-04-10T15:18:00.000Z',
      status: 'sent',
    },
    {
      id: 'tour-chat-demo-3',
      phone: p,
      direction: 'inbound',
      body: 'Sounds good, thanks.',
      sentAt: '2026-04-10T15:19:00.000Z',
      status: 'delivered',
    },
    {
      id: 'tour-chat-demo-4',
      phone: p,
      direction: 'outbound',
      body:
        "Your estimate is ready. We can text a link to review the recommended work and approve when you're ready.",
      sentAt: '2026-04-10T16:45:00.000Z',
      status: 'sent',
    },
    {
      id: 'tour-chat-demo-5',
      phone: p,
      direction: 'inbound',
      body: 'Perfect — I’ll watch for it.',
      sentAt: '2026-04-10T16:46:00.000Z',
      status: 'delivered',
    },
  ]
}

type TourDemoRowSpec = Partial<Ticket> & {
  name: string
  vehicle: string
  vehicleStatus: Ticket['vehicleStatus']
  inspectionStatus: Ticket['inspectionStatus']
  tourDemoRowActionAccent?: Ticket['tourDemoRowActionAccent']
  tourDemoInvoiceViewed?: boolean
}

/**
 * Eight sample rows for the main tour “actions” and “styles” steps (and empty-queue fallback).
 * Notification mix: two chat, two approvals, two inspection (incomplete + complete), two neutral.
 */
export function buildTourStyleDemoTicketsRaw(): Ticket[] {
  const rows: TourDemoRowSpec[] = [
    {
      name: 'Jordan Lee',
      vehicle: '2022 Honda Civic',
      vehicleStatus: 'In Shop',
      technician: 'M. Ruiz',
      salesrep: 'A. Chen',
      inspectionStatus: 'none',
      tourDemoRowActionAccent: 'chat',
    },
    {
      name: 'Sam Rivera',
      vehicle: '2019 Ford F-150',
      vehicleStatus: 'Awaiting Parts',
      technician: 'L. Patel',
      salesrep: 'A. Chen',
      inspectionStatus: 'none',
      tourDemoRowActionAccent: 'chat',
    },
    {
      name: 'Taylor Brooks',
      vehicle: '2021 Toyota RAV4',
      vehicleStatus: 'Ready',
      technician: 'M. Ruiz',
      salesrep: 'R. Ortiz',
      inspectionStatus: 'none',
      tourDemoRowActionAccent: 'approvals',
    },
    {
      name: 'Riley Nguyen',
      vehicle: '2020 Subaru Outback',
      vehicleStatus: 'Inspection Complete',
      technician: 'K. Diaz',
      salesrep: 'R. Ortiz',
      inspectionStatus: 'none',
      tourDemoRowActionAccent: 'approvals',
    },
    {
      name: 'Casey Morgan',
      vehicle: '2018 Chevy Silverado',
      vehicleStatus: 'On Lot',
      technician: 'L. Patel',
      salesrep: 'A. Chen',
      inspectionStatus: 'incomplete',
    },
    {
      name: 'Alex Kim',
      vehicle: '2023 Hyundai Elantra',
      vehicleStatus: 'Awaiting Callback',
      technician: 'K. Diaz',
      salesrep: 'R. Ortiz',
      inspectionStatus: 'complete',
    },
    {
      name: 'Morgan Patel',
      vehicle: '2021 Mazda CX-5',
      vehicleStatus: 'Check In',
      technician: 'M. Ruiz',
      salesrep: 'A. Chen',
      inspectionStatus: 'none',
    },
    {
      name: 'Jamie Chen',
      vehicle: '2017 Nissan Altima',
      vehicleStatus: 'In Shop',
      technician: 'L. Patel',
      salesrep: 'R. Ortiz',
      inspectionStatus: 'none',
      tourDemoInvoiceViewed: true,
    },
  ]

  return rows.map((r, i) => {
    const ticketNumber = DEMO_BASE + i + 1
    const inspectionId =
      r.inspectionStatus && r.inspectionStatus !== 'none' ? `INS-tour-${ticketNumber}` : undefined
    return {
      id: -(ticketNumber),
      ticketNumber,
      date: '04/09/2026',
      type: 'W',
      salesrep: r.salesrep ?? '—',
      technician: r.technician ?? '—',
      name: r.name,
      vehicle: r.vehicle,
      total: 249.95 + i * 75,
      vehicleStatus: r.vehicleStatus,
      inspectionStatus: r.inspectionStatus,
      inspectionId,
      tourDemoRowActionAccent: r.tourDemoRowActionAccent,
      phone: '(555) 010-' + String(1000 + i).slice(1),
      email: `customer${i + 1}@example.com`,
      promisedTime: '04/09/2026 2:00 PM',
      apptDurationMinutes: 60,
      mileage: 42000 + i * 1200,
      tourDemoInvoiceViewed: r.tourDemoInvoiceViewed,
    } as Ticket
  })
}

export function buildTourDrawerDemoTicket(): Ticket {
  const t = buildTourStyleDemoTicketsRaw().find((x) => x.ticketNumber === TICKETS_TOUR_DEMO_DRAWER_TICKET_NUMBER)
  return (
    t ?? {
      ...buildTourStyleDemoTicketsRaw()[0]!,
      ticketNumber: TICKETS_TOUR_DEMO_DRAWER_TICKET_NUMBER,
      id: -TICKETS_TOUR_DEMO_DRAWER_TICKET_NUMBER,
      total: 489.5,
    }
  )
}

function buildDemoInvoice(ticketNumber: number): Invoice {
  return {
    InvoiceNum: ticketNumber,
    InvoiceVersion: 1,
    StoreNum: 3,
    StoreName: 'Demo Shop',
    VehicleBarCode: '',
    Delivery: '',
    Salesrep: 'REP',
    SalesrepName: 'Demo Rep',
    Route: '',
    RouteName: '',
    CustomerTaxCode: '',
    CustomerSalesRep: '',
    CustomerSalesRepName: '',
    Taxable: 'Y',
    SalesTax: '32.50',
    SoldPastDue: 'N',
    CustomerType: '',
    CustNoFET: 'N',
    CustNoFETTax: 'N',
    COD: '',
    Name: 'Tour Demo Customer',
    Address: '123 Main St',
    City: 'Austin',
    State: 'TX',
    Zip: '78701',
    PO: '',
    AutoTag: 'DEMO1',
    AutoTagState: 'TX',
    AutoMake: 'Honda',
    AutoModel: 'Civic',
    AutoYear: '2022',
    VIN: '1HGCV1F3XNA000001',
    Mileage: 45210,
    Cost: '200',
    Subtotal: '350.00',
    Amount: '382.50',
    Adjustment: '0',
    DateSold: '04/09/2026',
    CustomerNum: 1,
    ApptActive: '',
    ApptDateTime: '',
    ApptDuration: '',
    ApptCode: '',
    ApptText: '',
    BayCode: '',
    BayText: '',
    OpenStatus: '',
    TicketType: 'W',
    ApptVehicleStatus: '',
    ServiceReminder: '',
    Phone: '(555) 010-0001',
    Email: 'tour@example.com',
    LastEditedBy: '',
    LastEditedDateTime: '',
    TechnicianCode: '',
    TechnicianName: '',
    TicketMemo: '',
    PendingNotifications: '',
    BillToNum: '',
    BillToName: '',
    ApptID: 0,
    Items: [],
    Payments: [],
  }
}

const demoDetailRows: DetailRow[] = [
  {
    InvoiceNum: TICKETS_TOUR_DEMO_DRAWER_TICKET_NUMBER,
    LineNum: 1,
    ProductNum: 'SVC001',
    Description: 'Oil change & inspection',
    Quantity: '1',
    PriceCode: '',
    RegularPrice: '89.95',
    UnitPrice: '89.95',
    UnitFet: '',
    Total: '89.95',
    UT1: '',
    Package: 0,
    Goods: 'S',
  },
  {
    InvoiceNum: TICKETS_TOUR_DEMO_DRAWER_TICKET_NUMBER,
    LineNum: 2,
    ProductNum: 'PART002',
    Description: 'Cabin air filter',
    Quantity: '1',
    RegularPrice: '45.00',
    UnitPrice: '45.00',
    Total: '45.00',
    Package: 0,
    Goods: 'G',
  },
]

export function buildTourDemoInvoiceDetail(ticketNumber: number = TICKETS_TOUR_DEMO_DRAWER_TICKET_NUMBER): InvoiceDetailResponse {
  const inv = buildDemoInvoice(ticketNumber)
  const rows = demoDetailRows.map((r) => ({ ...r, InvoiceNum: ticketNumber }))
  return {
    success: true,
    invoice: inv,
    invoiceRow: {
      InvoiceNum: ticketNumber,
      Merchandise: '45.00',
      FET: '0',
      Services: '314.50',
      Subtotal: '350.00',
      Cost: '200',
      SalesTax: '32.50',
      Total: '382.50',
      AutoTag: inv.AutoTag,
      AutoTagState: inv.AutoTagState,
      AutoMake: inv.AutoMake,
      AutoModel: inv.AutoModel,
      AutoYear: inv.AutoYear,
      VIN: inv.VIN,
      Mileage: inv.Mileage,
    },
    detailRows: rows,
  }
}

export function buildTourDemoTimelineData(): TicketTimelineData {
  /** Anchors in local time; later steps advance 45 minutes each (matches live tour timeline spacing). */
  const tOnlineAppt = new Date(2026, 3, 8, 20, 15, 0, 0).getTime()
  const tInShop = new Date(2026, 3, 10, 8, 15, 0, 0).getTime()
  const stepMs = 45 * 60 * 1000

  const tInspectionComplete = tInShop + stepMs
  const tInspectionSent = tInspectionComplete + stepMs
  const tInspectionViewed = tInspectionSent + stepMs
  const tTicketSent = tInspectionViewed + stepMs
  const tTicketViewed = tTicketSent + stepMs
  const tWorkApproved = tTicketViewed + stepMs

  const workApprovedDate = new Date(tWorkApproved)

  return {
    ticketSentEvents: [{ timestamp: tTicketSent, sentBy: 'Advisor' }],
    ticketViewed: tTicketViewed,
    inspectionSentEvents: [
      { timestamp: tInspectionSent, sentBy: 'Shop', inspectionId: 'INS-tour' },
    ],
    inspectionViewed: tInspectionViewed,
    workApprovals: [
      {
        timestamp: tWorkApproved,
        approvedDate: `${workApprovedDate.getMonth() + 1}/${workApprovedDate.getDate()}/${workApprovedDate.getFullYear()}`,
        approvedTime: workApprovedDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
        verbalApproval: false,
        approverName: 'J. Lee',
        hasSignature: true,
      },
    ],
    currentVehicleStatus: 'In Shop',
    vehicleStatusChanges: [
      { status: 'Online Appointment', timestamp: tOnlineAppt },
      { status: 'In Shop', timestamp: tInShop },
      { status: 'Inspection Complete', timestamp: tInspectionComplete },
    ],
  }
}

/**
 * In-memory work approval for Advanced tour step “Approvals tab” (matches invoice line copy and
 * timeline batch timestamps from {@link buildTourDemoTimelineData}).
 */
export function buildTourDemoWorkApprovalRecord(ticketNumber: number): WorkApprovalRecordV1 {
  const timeline = buildTourDemoTimelineData()
  const batch = timeline.workApprovals[0]
  const approvedAtIso =
    batch != null ? new Date(batch.timestamp).toISOString() : new Date('2026-04-10T17:45:00.000Z').toISOString()
  const approvedDate = batch?.approvedDate ?? '4/10/2026'
  const approvedTime = batch?.approvedTime ?? '12:45 PM'
  const sig = TOUR_DEMO_SIGNATURE_DATA_URL

  return {
    version: 1,
    ticketNumber,
    updatedAtIso: approvedAtIso,
    items: [
      {
        key: 'tour-demo-approval-line-1',
        lineNum: 1,
        description: 'Oil change & inspection',
        amount: 89.95,
        approvedAtIso,
        approvedDate,
        approvedTime,
        approverIp: 'unknown',
        signatureDataUrl: sig,
        verbalApproval: false,
      },
      {
        key: 'tour-demo-approval-line-2',
        lineNum: 2,
        description: 'Cabin air filter',
        amount: 45.0,
        approvedAtIso,
        approvedDate,
        approvedTime,
        approverIp: 'unknown',
        signatureDataUrl: sig,
        verbalApproval: false,
      },
    ],
  }
}
