# Tickets page — client persistence

Storage used by the **Tickets** experience (`/` and `/tickets`). **Excludes** all appointment keys and appointment pages.

**Entry:** [`src/pages/TicketsPage.vue`](../src/pages/TicketsPage.vue)

**Related:** Full-app inventory in [`LOCALSTORAGE_AND_CLIENT_PERSISTENCE.md`](LOCALSTORAGE_AND_CLIENT_PERSISTENCE.md).

---

## Summary

| Mechanism | What the tickets page uses it for |
|-----------|-----------------------------------|
| **Cookies** | Date range, view mode (`card` / `table` / `progress`), active preset id |
| **localStorage** | Ticket preferences blob, KPI caches, button-flash dismissals, mobile layout flags, onboarding, identity/permissions (read), store # |
| **sessionStorage** | Welcome modal snooze (current tab session) |
| **IndexedDB** | Timeline (send/view/status/approvals) and filter preset records |
| **In-memory** | Dev user context; invoice-detail query cache (`useQuery`); tour demo data (no storage) |
| **Optional HTTP** | `GET/PUT /api/preferences/tickets`; `persistTimelineEvent` when `VITE_TIMELINE_INSERT_URL` is set |

---

## 1. Cookies (TicketsPage)

Via [`useSessionCookie`](../src/composables/useSessionCookie.ts) in TicketsPage:

| Cookie | Purpose | Lifetime |
|--------|---------|----------|
| `tickets_date_range` | Date filter preset | Session (no `max-age`) |
| `tickets_custom_from_date` | Custom range start | Session |
| `tickets_custom_to_date` | Custom range end | Session |
| `tickets_view_mode` | `card` \| `table` \| `progress` | Session; written on style change / narrow-viewport coercion |
| `tickets_active_preset_id` | Last selected filter preset | `max-age` until next local **3:00 AM** |

**Behavior notes:**

- Date cookies are **not** written during initial `onMounted` until `dateFilterCookiesReady` is true (avoids clobbering restored preset dates).
- Narrow viewport may force `tickets_view_mode=card` unless the user opted into table via cookie **or** `tickets_mobile_table_override` (localStorage).

---

## 2. User preferences (localStorage + API + IndexedDB presets)

**Composable:** [`useUserPreferences`](../src/composables/useUserPreferences.ts) (initialized in TicketsPage `onMounted`).

| Storage | Key / DB | Contents |
|---------|----------|----------|
| localStorage | `user_ticket_preferences` | Style, filters, column/card/progress configs, preset list metadata, action visibility, etc. |
| HTTP | `/api/preferences/tickets` | Preferred load/save when proxy/backend is up |
| IndexedDB | `customer-care-presets` | Stores `ticket_presets_global`, `ticket_presets_local` — preset bodies ([`ticketPresetIndexedDb.ts`](../src/lib/ticketPresetIndexedDb.ts)) |

**Identity for preset scoping** (read only, not written by TicketsPage):

- `current_user` / `user_name`, `role_ID`, `customer_ID` from localStorage, or DEV [`useDevUserContext`](../src/composables/useDevUserContext.ts) / [`public/dev-user-context.json`](../public/dev-user-context.json).

**TicketsPage actions:** apply/create/update/delete presets, `applyPreset`, `setDefaultPreset`; mirrors active preset to cookie `tickets_active_preset_id`.

---

## 3. Timeline, views, inspections, approvals (IndexedDB)

**Init:** [`initTimelineIndexedDb()`](../src/lib/timelineIndexedDb.ts) at app boot ([`main.ts`](../src/main.ts)).

**DB:** `customer-care-timeline` → object store `timeline_events`.

**Facades used from TicketsPage:**

| Module | Tickets page usage |
|--------|-------------------|
| [`invoice-view-tracker`](../src/lib/invoice-view-tracker.ts) | List “viewed” state, `syncVehicleStatusTimelineFromTickets`, vehicle status on sync |
| [`inspection-view-tracker`](../src/lib/inspection-view-tracker.ts) | Inspection viewed/sent; mark sent/view from list actions |
| [`work-approvals`](../src/lib/work-approvals.ts) | Progress/actions drawer approval data |
| [`useTicketTimelineData`](../src/composables/useTicketTimelineData.ts) | Actions drawer timeline |

**Events TicketsPage listens for:**

- `timeline-idb-changed` — refresh list badges/KPIs
- `invoice-view-status-changed`, `inspection-view-status-changed`, `work-approval-changed` — legacy/custom events from tracker layers

**Optional server:** [`persistTimelineEvent`](../src/api/timeline.ts) on inspection send, vehicle status, list sync (uses `current_user` / `user_name` from localStorage for `User` field).

**Legacy:** One-time import from old localStorage keys (`invoice_view_status_*`, `ticket_sent_*`, etc.) into IDB; marker `timeline_idb_schema_v2_migrated`. Tickets page does not write those keys today.

**Tour:** Advanced tour uses in-memory demo approval ([`tickets-tour-demo.ts`](../src/lib/tickets-tour-demo.ts)) so real IDB is not mutated.

### Timeline event types (IndexedDB `type` column)

| Type | Meaning |
|------|---------|
| 1 | Vehicle status change |
| 2 | Ticket/invoice sent |
| 3 | Invoice viewed |
| 4 | Work approval |
| 5 | Inspection sent |
| 6 | Inspection viewed |

---

## 4. KPI / progress computed fields (localStorage)

**Composable:** [`useTicketComputedFields`](../src/composables/useTicketComputedFields.ts) — called when building progress/list rows.

Per `ticketNumber`:

| Key pattern | Purpose |
|-------------|---------|
| `ticket_last_type_{n}` | Last seen type `W` / `I` |
| `ticket_type_transition_to_invoice_{n}` | Ms when type became `I` |
| `ticket_first_invoice_observed_{n}` | First observation of type `I` |
| `ticket_first_workorder_observed_{n}` | First observation of type `W` |

Also reads vehicle status history via `getVehicleStatusChanges` (IndexedDB-backed).

---

## 5. Action button “flash” dismissals (localStorage)

Used by [`TableStyle.vue`](../src/components/tickets/styles/TableStyle.vue) and [`ProgressStyle.vue`](../src/components/tickets/styles/ProgressStyle.vue):

| Key | Composable |
|-----|------------|
| `view_button_flash_dismissals_v1` | [`useViewButtonState`](../src/composables/useViewButtonState.ts) |
| `inspection_button_flash_dismissals_v1` | [`useInspectionViewButtonState`](../src/composables/useInspectionViewButtonState.ts) |
| `timeline_approval_flash_dismissals_v1` | [`useApprovalsActionButtonState`](../src/composables/useApprovalsActionButtonState.ts) |

TicketsPage bumps reactive triggers (`viewStatusUpdateTrigger`, etc.) when timeline/storage changes.

---

## 6. Mobile layout (localStorage)

[`mobile-ticket-style.ts`](../src/lib/mobile-ticket-style.ts):

| Key | Purpose |
|-----|---------|
| `tickets_mobile_table_override` | User chose table on narrow viewport |
| `tickets_mobile_table_not_optimized_dismissed` | Dismissed “not optimized” banner |

---

## 7. Onboarding / welcome

[`tickets-onboarding.ts`](../src/lib/tickets-onboarding.ts):

| Key | Storage | Purpose |
|-----|---------|---------|
| `customer-care:tickets-onboarding-v1` | localStorage | Main tour `skipped` / `completed` |
| `customer-care:tickets-onboarding-advanced-v1` | localStorage | Advanced tour |
| `customer-care:tickets-onboarding-preset-builder-v1` | localStorage | Preset builder tour |
| `customer-care:tickets-welcome-snoozed-session-v1` | sessionStorage | Hide welcome modal until tab closes |

---

## 8. Permissions, financial display, chat (localStorage read)

[`usePermissions`](../src/composables/usePermissions.ts) on TicketsPage:

| Key | Effect on tickets UI |
|-----|----------------------|
| `permission_cost` | View / cost-related actions |
| `permission_Chat` + `HDN1` ∈ {1, 4, 6} | Chat/SMS (DEV: chat always on) |
| `HDN2` | Hide financial columns/sorts when `'1'` (DEV: `dev-user-context.json`) |

`canViewFinancial` drives stripping GP%/totals from filters, table/card/progress configs.

---

## 9. Store selection (localStorage)

[`getSelectedStoreNum()`](../src/composables/useStoreContext.ts) — key `customer_care_selected_store_num` — passed into ticket fetch (e.g. HITS notification). Shared composable, not appointment-specific.

---

## 10. Not browser persistence (tickets page)

| Item | Notes |
|------|--------|
| **Invoice detail cache** | [`invoice-detail-cache.ts`](../src/lib/invoice-detail-cache.ts) — query key only; data in `useQuery` memory |
| **Ticket list API** | [`fetchTickets`](../src/api/tickets.ts) — server; no local list cache key |
| **Inspection listener** | Real-time updates; not stored in browser by default |

---

## Data flow (tickets page)

```mermaid
flowchart TB
  TP[TicketsPage.vue]
  TP --> CK[cookies: dates / view / preset]
  TP --> PREF[useUserPreferences]
  PREF --> LS1[user_ticket_preferences]
  PREF --> IDB_P[(customer-care-presets)]
  PREF --> API_P[/api/preferences/tickets]
  TP --> TL[invoice / inspection / work-approvals]
  TL --> IDB_T[(customer-care-timeline)]
  TP --> KPI[useTicketComputedFields]
  KPI --> LS2[ticket_* per ticketNumber]
  TP --> FLASH[TableStyle / ProgressStyle]
  FLASH --> LS3[flash dismissals]
  TP --> ONB[tickets-onboarding]
  ONB --> LS4[onboarding keys]
  ONB --> SS[session welcome snooze]
```

---

## Verification

From repo root:

```bash
rg "localStorage|sessionStorage|getCookie|setCookie|timeline-idb|useUserPreferences|invoice-view-tracker" src/pages/TicketsPage.vue src/components/tickets src/composables/useTicket src/composables/useView src/composables/useInspection src/composables/useApprovals src/lib/tickets-onboarding src/lib/mobile-ticket-style src/lib/timelineIndexedDb src/lib/ticketPresetIndexedDb
```

---

## Out of scope

All `hd_appointments_*`, `appointment_*` keys, and appointment pages. See [`LOCALSTORAGE_AND_CLIENT_PERSISTENCE.md`](LOCALSTORAGE_AND_CLIENT_PERSISTENCE.md) for the full app inventory.
