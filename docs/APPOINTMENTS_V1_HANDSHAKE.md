# Appointments v1 Handshake Contracts

This document defines the API boundary used by the frontend-first Appointments module.

## Frontend Repository Adapter

Current adapter lives in `src/api/appointments.ts` and is intentionally local-first.

- `listAppointments(filters)`
- `createAppointmentRecord(draft)`
- `updateAppointmentRecord(id, patch)`
- `deleteAppointmentRecord(id)`
- `confirmAppointmentRecord(id, confirmedBy)`
- `moveAppointmentRecord(id, { bayId, requestedDate, requestedTime })`
- `canDropInBaySlot(...)`
- `getIcalSyncInfo(recordId)`
- `setIcalSyncInfo(recordId, info)`
- `mapWidgetPayloadToUnconfirmedRecord(input)`

## Record Taxonomy and View Rules

- Appointment records:
  - `booked_unconfirmed`
  - `confirmed`
- Note records (not appointments):
  - `quick_note`
  - `schedule_note`

View visibility:

- Calendar view shows appointments and notes.
- Bay view shows appointments and notes.
- List view shows appointments only (`booked_unconfirmed`, `confirmed`).

Create/save requirements:

- Appointment records require `customerName`.
- Quick notes do not require `customerName`.
- Schedule notes require `scheduleBlockerType`.

Schedule note blocker contract:

- `bay_blocker`: blocks confirmed appointments in same bay/time overlap.
- `shop_close`: blocks confirmed appointments in all bays/time overlap.
- `technician_unavailable`: informational only; does not hard-block scheduling.

Conflict enforcement:

- Hard blocking applies only to confirmed appointments.
- `booked_unconfirmed` may exist in blocked windows until confirmation.

## Planned HTTP Endpoints (Backend Sprint)

### Appointments

- `GET /api/appointments`
  - Query: `search`, `dateFrom`, `dateTo`, `bayIds[]`, `recordTypes[]`, `statuses[]`
  - Response:
    - `{ records: AppointmentRecord[] }`

- `POST /api/appointments`
  - Body:
    - `AppointmentRecordCreateInput`
  - Response:
    - `{ record: AppointmentRecord }`

- `PATCH /api/appointments/:id`
  - Body:
    - `Partial<AppointmentRecord>`
  - Response:
    - `{ record: AppointmentRecord }`

- `DELETE /api/appointments/:id`
  - Response:
    - `{ success: true }`

- `POST /api/appointments/:id/confirm`
  - Body:
    - `{ confirmedBy: string }`
  - Response:
    - `{ record: AppointmentRecord }`

### iCal Status and Feed

- `GET /api/appointments/:id/ical-status`
  - Response:
    - `{ status: "not_synced" | "synced" | "error", lastSyncedAt?: string }`

- `GET /api/shops/{account_id}/{store_id}/calendar.ics`
  - Auth scheme: TBD by backend
  - Content type: `text/calendar; charset=utf-8`
  - Includes:
    - confirmed appointments
    - schedule notes (bay blackouts)
  - Excludes:
    - quick notes
    - booked_unconfirmed

## Local-Only Placeholder Behavior

- `Resend to POS` is disabled in drawer for confirmed records.
- iCal sync defaults to `not_synced` and can be set via local adapter until backend sync is available.
- Widget intake writes booked-unconfirmed records to the same local appointment store used by Calendar/Bay/List.
