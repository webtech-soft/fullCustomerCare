/**
 * Stable `id` on the in-flyout presets control (TicketAdvancedFilters) so the tour can use
 * `getElementById` — attribute selectors can miss across Teleport / timing; ids match best-practice “reference element” resolution (see Floating UI / Popper anchor docs).
 */
export const TICKETS_PRESET_DROPDOWN_TRIGGER_ID = 'ticket-presets-dropdown-trigger' as const
export const TICKETS_PRESET_DROPDOWN_TRIGGER_SELECTOR = `#${TICKETS_PRESET_DROPDOWN_TRIGGER_ID}` as const

/** Tab (Group By) trigger button — tour opens the in-DOM list after a delay (same pattern as presets). */
export const TICKETS_TAB_GROUP_BY_TRIGGER_ID = 'ticket-tab-group-by-trigger' as const
export const TICKETS_TAB_GROUP_BY_TRIGGER_SELECTOR = `#${TICKETS_TAB_GROUP_BY_TRIGGER_ID}` as const

/** Align a panel corner to a point on the anchor element (fractions 0–1 from left/top of anchor rect). */
export type TicketTourPanelCornerPin = {
  corner: 'top-right'
  relX: number
  relY: number
  /** Gap between pin point and panel edge (default 8). */
  gapPx?: number
}

export type TicketOnboardingStep = {
  id: string
  selector: string | null
  /** If `selector` misses (e.g. button hidden), use this rect for the spotlight only. */
  spotlightFallbackSelector?: string | null
  panelAnchorSelector?: string | null
  spotlightUnionSelectors?: string[]
  title: string
  description: string
  /** Overrides default primary label on non-final steps ("Next"); on final step overrides "Done" when set. */
  primaryButtonLabel?: string
  /** When set, the tour panel renders this HTML instead of plain `description` (unless `description-override` is used). */
  descriptionHtml?: string
  panelPlacement?: 'default' | 'leftOfTarget' | 'rightOfTarget'
  /** Vertical alignment of the tour panel relative to the panel anchor (defaults to `top`). */
  panelVerticalAlign?: 'top' | 'bottom' | 'center'
  /** When set, overrides default side placement: e.g. top-right of panel touches (relX, relY) on anchor. */
  panelCornerPin?: TicketTourPanelCornerPin
}

/** Stable array reference — do not rebuild each render. */
export const TICKETS_ONBOARDING_MAIN_STEPS: TicketOnboardingStep[] = [
  {
    id: 'presets',
    /** Trigger + optional union with list panel driven by `spotlightPatch` on TicketsPage (see TicketAdvancedFilters). */
    selector: TICKETS_PRESET_DROPDOWN_TRIGGER_SELECTOR,
    panelAnchorSelector: TICKETS_PRESET_DROPDOWN_TRIGGER_SELECTOR,
    panelPlacement: 'leftOfTarget',
    panelCornerPin: {
      corner: 'top-right',
      // ~¼ along the dropdown top (near end of “All tickets” label), matching tour pin UX.
      relX: 0.27,
      relY: 0,
      gapPx: 8,
    },
    title: 'Start with presets',
    description:
      'Use the Presets dropdown to load a saved view. Here you can find your favorites, company presets, and system presets.',
  },
  {
    id: 'tabGroup',
    selector: TICKETS_TAB_GROUP_BY_TRIGGER_SELECTOR,
    panelPlacement: 'rightOfTarget',
    panelAnchorSelector: TICKETS_TAB_GROUP_BY_TRIGGER_SELECTOR,
    title: 'Group with tabs',
    description:
      'Tab (Group By) organizes tickets into tabs—by technician, vehicle status, and more—so similar work stays together.',
  },
  {
    id: 'actions',
    selector: '[data-onboarding="ticket-row-actions"]',
    panelPlacement: 'default',
    panelAnchorSelector: '[data-onboarding="ticket-row-actions"]',
    title: 'Actions',
    description:
      'Next: advance the ticket to the next vehicle status. View: view the ticket and send it to your customer. Chat: message the customer. Inspection: jump into the inspection / DVI flow. Timeline: history, vehicle moves, and viewed timestamps. Approvals: signed-off work. Which buttons appear here depends on Edit actions (in Filters) and your permissions.',
    descriptionHtml:
      '<strong>Next</strong>: advance the ticket to the next vehicle status. <strong>View</strong>: view the ticket and send it to your customer. <strong>Chat</strong>: message the customer. <strong>Inspection</strong>: jump into the inspection / DVI flow. <strong>Timeline</strong>: history, vehicle moves, and viewed timestamps. <strong>Approvals</strong>: signed-off work. Which buttons appear here depends on Edit actions (in Filters) and your permissions.',
  },
  {
    id: 'filters',
    selector: '[data-onboarding="ticket-filters-grid"]',
    spotlightUnionSelectors: ['[data-onboarding="ticket-filters-footer"]'],
    panelPlacement: 'rightOfTarget',
    panelAnchorSelector: '[data-onboarding="ticket-filters-grid"]',
    title: 'Narrow your queue',
    description:
      'Refine by date, type, people, status, and more, then Apply so results update deliberately. Less noise means faster decisions.',
  },
  {
    id: 'styles',
    selector: '[data-onboarding="ticket-style-selector"]',
    panelPlacement: 'default',
    panelAnchorSelector: '#tickets-header-style-picker',
    title: 'Choose your layout',
    description:
      'Table, cards, and progress views spotlight different work. The tour cycles each style so you can compare. On the last card you can open Advanced tour for drawers and preset tips—or finish the quick tour anytime with Done or Skip.',
  },
  {
    id: 'finish',
    selector: null,
    title: 'You are ready to use',
    primaryButtonLabel: 'Done',
    description:
      'Rerun this quick tour anytime from the info button in the header. Presets, filters, and your chosen layout stay available for everyday queue work—or start Advanced tour below for drawers and preset building.',
  },
]

/** Advanced tour step id: row action colors / pulse (final step). */
export const TICKETS_ONBOARDING_ADV_ACTION_BUTTON_STATES_STEP_ID = 'adv-action-button-states' as const

/** Drawer + Edit Actions + row signals (9 steps). Preset-building steps live in {@link TICKETS_ONBOARDING_PRESET_BUILDER_STEPS}. */
export const TICKETS_ONBOARDING_ADVANCED_STEPS: TicketOnboardingStep[] = [
  {
    id: 'adv-drawer-view-footer',
    selector: '[data-onboarding="ticket-drawer-request-approval"]',
    spotlightFallbackSelector: '[data-onboarding="ticket-drawer-view-footer"]',
    panelAnchorSelector: '[data-onboarding="ticket-drawer-view-footer"]',
    title: 'View tab: approve & send',
    description:
      'Request Approval drafts a guided message to the customer. Send to customer pushes the invoice or work order link by SMS or email.',
  },
  {
    id: 'adv-drawer-invoice-preview',
    selector: '[data-onboarding="ticket-drawer-invoice-preview"]',
    panelPlacement: 'leftOfTarget',
    title: 'Invoice area',
    description:
      'Scroll the preview for totals, line items, and vehicle details before you share anything—so you’re sure what the customer will see.',
  },
  {
    id: 'adv-drawer-open-customer',
    selector: '[data-onboarding="ticket-drawer-open-customer"]',
    panelPlacement: 'leftOfTarget',
    title: 'Open full customer view',
    description:
      'Open the same document the customer sees in the browser. From there they can review work and respond—especially for approvals.',
  },
  {
    id: 'adv-drawer-customer-copy',
    selector: '[data-onboarding="ticket-drawer-tabs"]',
    panelPlacement: 'leftOfTarget',
    title: 'After the customer approves',
    description:
      'Customers submit work approvals from their view. You switch between these tabs—Chat, Timeline, Approvals—to track messages, history, and signed work without losing context.',
  },
  {
    id: 'adv-drawer-chat',
    selector: '[data-onboarding="ticket-chat-panel"]',
    spotlightUnionSelectors: [
      '[data-onboarding="ticket-chat-channel"]',
      '[data-onboarding="ticket-chat-composer"]',
      '[data-onboarding="ticket-chat-quick-inserts"]',
    ],
    panelPlacement: 'leftOfTarget',
    title: 'Chat tab',
    description:
      'Choose SMS or email, write or edit the message in the composer, then use quick inserts for links and approval asks—one place, three controls.',
  },
  {
    id: 'adv-drawer-timeline',
    selector: '[data-onboarding="ticket-timeline-panel"]',
    panelPlacement: 'leftOfTarget',
    title: 'Timeline tab',
    description:
      'Vehicle status moves through the shop in order. Ticket and inspection “viewed” timestamps show when someone opened the customer-facing links. Work approvals land here too—your full repair trail.',
  },
  {
    id: 'adv-drawer-approvals',
    selector: '[data-onboarding="ticket-drawer-approvals-panel"]',
    panelPlacement: 'leftOfTarget',
    title: 'Approvals tab',
    description:
      'See signed work for this ticket: lines, approver, and metadata in one place—without hunting through messages.',
  },
  {
    id: 'adv-edit-actions',
    selector: '[data-onboarding="ticket-edit-actions-trigger"]',
    spotlightUnionSelectors: ['[data-onboarding="ticket-edit-actions-panel"]'],
    panelPlacement: 'rightOfTarget',
    title: 'Edit Actions',
    description:
      'Customize which row actions appear per layout. Table, cards, and progress can each use a different set—so the right buttons match each view. Continue for a quick guide to row button colors; on the last card you can start How to build a preset.',
  },
  {
    id: TICKETS_ONBOARDING_ADV_ACTION_BUTTON_STATES_STEP_ID,
    selector: '[data-onboarding="ticket-row-actions"]',
    panelPlacement: 'default',
    panelAnchorSelector: '[data-onboarding="ticket-row-actions"]',
    title: 'Action buttons: colors & alerts',
    primaryButtonLabel: 'Done',
    description:
      'Solid brand fill on View means the customer opened the invoice or work link; on Approvals (in live data) it usually matches your theme when signed work exists. A pulsing fill is “new since you last looked”—usually the last few minutes—so open that button to review or reply. Yellow Inspection means the inspection is still in progress in the shop. Outline buttons have no special alert. The first sample row shows Inspection in yellow, Chat pulsing, and Approvals in the same solid brand fill as signed work so you can compare cues side by side; other rows match the quick tour mix.',
    descriptionHtml:
      '<strong>View</strong>: solid = customer viewed the link; pulse = very recent view—open to review or send. <strong>Approvals</strong>: in production, solid theme fill when signed work exists (pulse when new); the spotlight row uses that same <strong>brand fill</strong> here—<strong>without</strong> pulse—so it reads apart from pulsing Chat. <strong>Inspection</strong>: yellow = still in progress in the shop; solid accent when complete; pulse on complete = customer recently opened the inspection link. <strong>Outline</strong> = no alert on that control. <strong>Chat</strong> on the spotlight row <strong>pulses</strong>—same “look now” idea as live new activity. <strong>What to do</strong>: use the highlighted action first; pulses are your “look now” signal.',
  },
]

export const TICKETS_ONBOARDING_PRESET_BUILDER_STEPS: TicketOnboardingStep[] = [
  {
    id: 'adv-preset-display',
    selector: '[data-onboarding="ticket-preset-display-inline"]',
    panelPlacement: 'rightOfTarget',
    title: 'Display',
    description:
      'Best practice: start with how you want tickets to look—table, cards, or progress—then layer options below.',
  },
  {
    id: 'adv-preset-tab',
    selector: '[data-onboarding="ticket-tab-group-by"]',
    panelPlacement: 'rightOfTarget',
    title: 'Tabs',
    description:
      'Optional: set Tab (Group By) so this preset opens with tickets already split the way you work (tech, status, etc.).',
  },
  {
    id: 'adv-preset-sort',
    selector: '[data-onboarding="ticket-sort"]',
    panelAnchorSelector: '[data-onboarding="ticket-sort-select"]',
    panelPlacement: 'rightOfTarget',
    title: 'Sort',
    description:
      'Pick the default sort—for example Ready first or oldest ticket—so the queue opens in your preferred order.',
  },
  {
    id: 'adv-preset-filters',
    selector: '[data-onboarding="ticket-filters-grid"]',
    panelPlacement: 'rightOfTarget',
    title: 'Filters',
    description:
      'Narrow types, people, dates, and status once; those choices save with the preset so every load matches your scope.',
  },
  {
    id: 'adv-preset-fields',
    selector: '[data-onboarding="ticket-preset-fields"]',
    panelPlacement: 'rightOfTarget',
    title: 'Fields',
    description:
      'Choose visible columns or card fields and order—only the data this preset needs on screen.',
  },
  {
    id: 'adv-preset-actions',
    selector: '[data-onboarding="ticket-edit-actions-trigger"]',
    spotlightUnionSelectors: ['[data-onboarding="ticket-edit-actions-panel"]'],
    panelPlacement: 'rightOfTarget',
    title: 'Actions',
    description:
      'Tie row actions to the preset’s job: fewer distractions in the shop view, more approvals in the advisor view, and so on.',
  },
  {
    id: 'adv-preset-save',
    selector: '[data-onboarding="ticket-save-preset"]',
    panelPlacement: 'rightOfTarget',
    title: 'Save',
    description:
      'Save Preset stores the whole package—display, tabs, sort, filters, fields, and actions—under one name.',
  },
  {
    id: 'adv-preset-favorite',
    selector: '[data-onboarding="ticket-preset-favorite"]',
    spotlightUnionSelectors: ['[data-onboarding="ticket-presets-dropdown-panel"]'],
    panelPlacement: 'leftOfTarget',
    title: 'Favorite',
    description:
      'Star a go-to preset so it’s easy to find in the picker—one tap back to your daily setup. Your favorite view will load first when you log in each day.',
  },
]
