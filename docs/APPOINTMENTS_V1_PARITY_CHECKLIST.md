# Appointments v1 Parity Checklist

Use this checklist for QA and release sign-off against POS parity expectations.

## Record Types

- [ ] Create, edit, and delete Quick Note
- [ ] Create, edit, and delete Schedule Note
- [ ] Create, edit, confirm, and delete Booked (Unconfirmed)
- [ ] Create, edit, and delete Confirmed Appointment
- [ ] Confirm `booked_unconfirmed` and `confirmed` are treated as appointment records
- [ ] Confirm `quick_note` and `schedule_note` are treated as note records

## Calendar View

- [ ] Month shows event chips by day with `+N more` overflow
- [ ] Week view renders time rows and all 7 day columns
- [ ] Day view renders selected-day timeline
- [ ] Event block sizing scales with appointment duration
- [ ] Clicking event opens Appointment Detail Drawer
- [ ] Dragging in Week/Day updates date/time
- [ ] Quick notes and schedule notes render in calendar views

## Bay View

- [ ] Sticky time column and sticky bay headers
- [ ] Leftmost `NB` (No Bay) column visible
- [ ] Bay cards show customer, vehicle, and start/end time
- [ ] Schedule Note blackout can be created from empty cell
- [ ] Schedule Note blackout can be deleted
- [ ] No-drop enforcement blocks drag into blackout slot
- [ ] Dragging across bay/time updates immediately
- [ ] Undo toast available for drag move
- [ ] Bay blocker schedule notes render as bay-scoped blocked windows
- [ ] Shop close schedule notes render across bays for the blocked time
- [ ] Technician unavailable schedule notes render but do not hard block slot usage

## Drawer + Actions

- [ ] Inline editing updates record values
- [ ] Confirm action appears only for unconfirmed records
- [ ] Confirm action changes record to confirmed immediately
- [ ] Delete action requires explicit confirmation
- [ ] Confirmed records show disabled `Resend to POS` placeholder
- [ ] iCal status appears in drawer
- [ ] Customer name validation applies only to appointment record types
- [ ] Schedule note requires blocker subtype before save
- [ ] Quick note can save with empty customer/title field

## List View

- [ ] List shows only booked-unconfirmed and confirmed appointment records
- [ ] Quick notes and schedule notes never render in list view

## Widget Intake

- [ ] Widget submission creates booked-unconfirmed record
- [ ] Created widget record defaults into `NB` column
- [ ] `APPT_api_submitted` intent flag is set (`apiSubmitted=true`)
- [ ] `sendText` defaults true when phone exists

## Search and Filters

- [ ] Search works for customer, vehicle, bay, and date text
- [ ] Date range filters (from/to) apply to all views
- [ ] Record type and status filters are additive
- [ ] Filter state persists while switching views

## Deferred/Placeholder (Expected in v1)

- [ ] POS push remains disabled placeholder
- [ ] iCal feed endpoint contract documented; backend endpoint pending
