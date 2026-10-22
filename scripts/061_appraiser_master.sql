-- =========================================================
-- APPRAISER MASTER
-- Jewel / gold loan appraisers maintained per branch
-- (Settings > Management > Manage Appraiser Details)
-- =========================================================
create table public.appraiser_master (
  appraiser_id serial not null,
  branch_id integer not null,
  appraiser_code character varying(20) not null,
  appraiser_name character varying(150) not null,
  license_no character varying(50) null,
  license_valid_till date null,
  mobile_no character varying(15) null,
  email character varying(150) null,
  address text null,
  status character varying(20) not null default 'ACTIVE'::character varying,
  created_by character varying(100) null,
  created_at timestamp without time zone null default now(),
  updated_by character varying(100) null,
  updated_at timestamp without time zone null,
  account_number numeric null,
  account_type character varying(50) null, -- SAVINGS | SUNDRY_CREDITOR | CURRENT | CASH | OTHER
  constraint appraiser_master_pkey primary key (appraiser_id),
  constraint uq_appraiser_code unique (branch_id, appraiser_code)
) TABLESPACE pg_default;

create index IF not exists idx_appraiser_branch on public.appraiser_master using btree (branch_id) TABLESPACE pg_default;

create index IF not exists idx_appraiser_status on public.appraiser_master using btree (status) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_appraiser_branch ON appraiser_master(branch_id);
CREATE INDEX IF NOT EXISTS idx_appraiser_status ON appraiser_master(status);
