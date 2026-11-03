create table nominee_details (
  id uuid not null default gen_random_uuid (),
  branch_id character varying(20) not null,
  account_number character varying(20) null,
  is_member boolean not null default false,
  member_id character varying(20) null,
  nominee_name character varying(100) not null,
  nominee_relation character varying(50) not null,
  nominee_dob date null,
  nominee_gender character varying(10) null,
  nominee_age integer not null default 0,
  nominee_address text null,
  nominee_percentage numeric(5, 2) not null default 0.00,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint nominee_details_pkey primary key (id)
) TABLESPACE pg_default;