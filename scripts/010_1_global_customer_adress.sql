ALTER TABLE public.customers
  DROP COLUMN aadhaar_no,
  DROP COLUMN pan_no;



CREATE TABLE public.customer_address (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    customer_code character(8) NOT NULL,
    
    -- Current Address Columns
    house_no text NULL,
    street text NULL,
    village text NULL,
    mandal_thaluka text NULL,
    district text NULL,
    state text DEFAULT 'Tamil Nadu'::text,
    pincode character varying(10) NULL,
    email character varying(100) NULL,
    phone_no character varying(15) NULL,
    
    -- Permanent Address Columns
    permanent_house_no text NULL,
    permanent_street text NULL,
    permanent_village text NULL,
    permanent_mandal_thaluka text NULL,
    permanent_district text NULL,
    permanent_state text DEFAULT 'Tamil Nadu'::text,
    permanent_pincode character varying(10) NULL,
    permanent_email character varying(100) NULL,
    permanent_phone_no character varying(15) NULL,
    
    is_active boolean NULL DEFAULT true,
    created_at timestamp without time zone NULL DEFAULT now(),
    updated_at timestamp without time zone NULL DEFAULT now(),
    
    CONSTRAINT customer_address_pkey PRIMARY KEY (id),
    CONSTRAINT customer_address_customer_code_key UNIQUE (customer_code)
) TABLESPACE pg_default;



ALTER TABLE public.customer_address
ADD CONSTRAINT customer_address_customer_code_fkey
FOREIGN KEY (customer_code)
REFERENCES public.customers (customer_code)
ON UPDATE CASCADE
ON DELETE SET NULL;

CREATE TABLE public.customer_kycdetails (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    customer_code character(8) NOT NULL,
    
    aadhaar_no character(16) UNIQUE NULL,
    pan_no character(10) UNIQUE NULL,
    ration_no character varying(20) UNIQUE NULL,
    driving_license_no character varying(20) UNIQUE NULL,
    
    is_active boolean NULL DEFAULT true,
    created_at timestamp without time zone NULL DEFAULT now(),
    updated_at timestamp without time zone NULL DEFAULT now(),
    
    CONSTRAINT customer_kycdetails_pkey PRIMARY KEY (id),
    CONSTRAINT customer_kycdetails_customer_code_fkey FOREIGN KEY (customer_code)
        REFERENCES public.customers (customer_code)
        ON UPDATE CASCADE
         ON DELETE CASCADE
) TABLESPACE pg_default;
