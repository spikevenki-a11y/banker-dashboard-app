CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    customer_code CHAR(8) UNIQUE NOT NULL,   -- 8 digit visible ID (00000001 etc)

    -- Core Identity
    full_name TEXT NOT NULL,
    father_name TEXT,
    gender CHAR(1) CHECK (gender IN ('M','F','O')),
    date_of_birth DATE NOT NULL,

    -- Legal Identity (Global Uniqueness)
    aadhaar_no CHAR(12) UNIQUE,
    pan_no CHAR(10) UNIQUE,

    -- Contact
    mobile_no VARCHAR(15),
    email VARCHAR(100),

    -- Address
    address_line1 TEXT,
    address_line2 TEXT,
    village TEXT,
    taluk TEXT,
    district TEXT,
    state TEXT DEFAULT 'Tamil Nadu',
    pincode VARCHAR(10),

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
ALTER TABLE public.customers
ALTER COLUMN aadhaar_no TYPE varchar(16);

ALTER TABLE public.customers
DROP CONSTRAINT customers_gender_check;

ALTER TABLE public.customers
ALTER COLUMN gender TYPE varchar(10);

ALTER TABLE public.customers
ADD CONSTRAINT customers_gender_check
CHECK (gender IN ('male', 'female', 'others'));



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