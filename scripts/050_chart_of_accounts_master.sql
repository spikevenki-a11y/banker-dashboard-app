create table chart_of_accounts_master (
  serial_no uuid not null default gen_random_uuid (),
  accountcode bigint not null,
  accountname character varying(200) not null,
  accounttypecode integer not null,
  isledger bit(1) not null default '0'::"bit",
  parentaccountcode bigint null,
  accountbalance numeric(18, 2) not null default 0,
  isactive bit(1) not null default '1'::"bit",
  createddate timestamp with time zone null,
  modifieddate timestamp with time zone null
) TABLESPACE pg_default;

