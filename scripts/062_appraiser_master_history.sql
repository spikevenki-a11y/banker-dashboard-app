-- =========================================================
-- APPRAISER MASTER HISTORY
-- One row per add / update of an appraiser: full snapshot of the
-- details after the change, plus the old -> new values that changed.
-- =========================================================

create table public.appraiser_master_history (
  history_id serial not null,
  appraiser_id integer not null,
  branch_id integer not null,
  action character varying(20) not null,
  changes jsonb null,
  appraiser_code character varying(20) not null,
  appraiser_name character varying(150) not null,
  license_no character varying(50) null,
  license_valid_till date null,
  mobile_no character varying(15) null,
  email character varying(150) null,
  address text null,
  status character varying(20) not null,
  changed_by character varying(100) null,
  changed_at timestamp without time zone null default now(),
  account_type character varying(50) null,
  account_number numeric null,
  constraint appraiser_master_history_pkey primary key (history_id),
  constraint appraiser_master_history_appraiser_id_fkey foreign KEY (appraiser_id) references appraiser_master (appraiser_id)
) TABLESPACE pg_default;

create index IF not exists idx_appraiser_hist_appraiser on public.appraiser_master_history using btree (appraiser_id, changed_at) TABLESPACE pg_default;

create index IF not exists idx_appraiser_hist_branch on public.appraiser_master_history using btree (branch_id) TABLESPACE pg_default;

-- Backfill: seed a CREATED entry for appraisers added before history existed
INSERT INTO appraiser_master_history
    (appraiser_id, branch_id, action, changes, appraiser_code, appraiser_name, license_no,
     license_valid_till, mobile_no, email, address, status, changed_by, changed_at)
SELECT m.appraiser_id, m.branch_id, 'CREATED', NULL, m.appraiser_code, m.appraiser_name, m.license_no,
       m.license_valid_till, m.mobile_no, m.email, m.address, m.status,
       COALESCE(m.updated_by, m.created_by), COALESCE(m.updated_at, m.created_at, now())
FROM appraiser_master m
WHERE NOT EXISTS (SELECT 1 FROM appraiser_master_history h WHERE h.appraiser_id = m.appraiser_id);
