-- timeline_events: flat table for all timeline events (screenshot parity, snake_case).
-- Type: 1 = Vehicle Status, 2 = Sent, 3 = Viewed, 4 = Approval,
--       5 = Inspection Sent, 6 = Inspection Viewed (client-local extensions).
--
-- User: HITS Username; used for Types 1, 2. Sourced from auth token and backend.
-- TicketTotal: Snapshot at event time; used for Types 1, 2, 3.
-- VehicleStatus: HITS numeric constants (see mapVehicleStatusToApi); Type 1 only.
-- IPaddress: "IP where CV sent/viewed"; Types 2, 3. Captured server-side from request.
-- ApprovalName: "Approver name" from verbal-approval UI when "Approval was made verbally" checked; Type 4 only.
-- Hide: 0 = visible to customer; 1 = hidden from customer.
--
-- SQLite types below. For Postgres: use SERIAL/BIGSERIAL, TIMESTAMPTZ, DECIMAL(6,2), BOOLEAN, etc.

CREATE TABLE timeline_events (
  id                                 INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_num                         INTEGER NOT NULL,
  type                               INTEGER NOT NULL,
  username                           TEXT,
  datetime                           TEXT NOT NULL,
  date_time                          TEXT,
  ticket_total                       REAL,
  vehicle_sts                        INTEGER,
  ip                                 TEXT,
  approval_total                     REAL,
  approval_name                      TEXT,
  approval_details                   TEXT,
  approval_signature                 TEXT,
  hide                               INTEGER NOT NULL DEFAULT 0,
  notification_physical_attempt_cnt  INTEGER NOT NULL DEFAULT 0,
  notification_sms_attempt_cnt       INTEGER NOT NULL DEFAULT 0,
  last_attempt_dt                    TEXT,
  last_attempt_tm                    TEXT,
  est_amt                            REAL,
  est_auto_send                      INTEGER,
  store                              INTEGER,
  account                            INTEGER,
  attr_link                          TEXT,
  attr_token                         TEXT,
  attr_event_ts                      INTEGER,
  attr_payload_json                  TEXT,
  created_at                         TEXT NOT NULL,
  updated_at                         TEXT NOT NULL
);

CREATE INDEX idx_timeline_events_ticket_num_datetime ON timeline_events (ticket_num, datetime);
CREATE INDEX idx_timeline_events_ticket_num_type ON timeline_events (ticket_num, type);
CREATE INDEX idx_timeline_events_last_attempt ON timeline_events (last_attempt_dt, last_attempt_tm);
CREATE INDEX idx_timeline_events_sms_attempt_cnt ON timeline_events (notification_sms_attempt_cnt);
CREATE INDEX idx_timeline_events_physical_attempt_cnt ON timeline_events (notification_physical_attempt_cnt);

-- Reconciliation note (client temporary ownership):
-- - Source-generated now: ticket_num, type, datetime, username, ticket_total,
--   vehicle_sts, ip, approval_* fields, hide, attr_link, attr_token, attr_event_ts.
-- - Placeholder/defaulted client-side for parity until backend owns writes:
--   notification_*_attempt_cnt, last_attempt_dt, last_attempt_tm, est_amt, est_auto_send, store, account.
-- - attr_payload_json carries local-only rich payloads used to rebuild ticket-centric views
--   (view status, inspection view/sent metadata, work approval item details).
