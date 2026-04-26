
create table public.customers (
  id uuid not null default gen_random_uuid (),
  customer_code character(8) not null,
  full_name text not null,
  father_name text null,
  gender character varying(10) null,
  date_of_birth date not null,
  email character varying(100) null,
  is_active boolean null default true,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  customer_type text not null,
  spouse_name character varying null,
  marital_status character varying null,
  blood_group character varying null,
  caste_category character varying null,
  occupation character varying null,
  qualification character varying null,
  qualification_details character varying null,
  constraint customers_pkey primary key (id),
  constraint customers_customer_code_key unique (customer_code),
  constraint customers_gender_check check (
    (
      (gender)::text = any (
        (
          array[
            'male'::character varying,
            'female'::character varying,
            'others'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

CREATE SEQUENCE customer_code_seq
START 1
INCREMENT 1
MINVALUE 1
MAXVALUE 99999999
CACHE 1;


create table public.customer_kycdetails (
  id uuid not null default gen_random_uuid (),
  customer_code character(8) not null,
  aadhaar_no character(16) null,
  pan_no character(10) null,
  ration_no character varying(20) null,
  driving_license_no character varying(20) null,
  is_active boolean null default true,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  constraint customer_kycdetails_pkey primary key (id),
  constraint customer_kycdetails_customer_code_fkey foreign KEY (customer_code) references customers (customer_code) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;

create unique INDEX IF not exists unique_aadhaar_no_not_null on public.customer_kycdetails using btree (aadhaar_no) TABLESPACE pg_default
where
  (aadhaar_no is not null);

create unique INDEX IF not exists unique_pan_no_not_null on public.customer_kycdetails using btree (pan_no) TABLESPACE pg_default
where
  (pan_no is not null);

create unique INDEX IF not exists unique_ration_no_not_null on public.customer_kycdetails using btree (ration_no) TABLESPACE pg_default
where
  (ration_no is not null);

create unique INDEX IF not exists unique_dl_no_not_null on public.customer_kycdetails using btree (driving_license_no) TABLESPACE pg_default
where
  (driving_license_no is not null);
