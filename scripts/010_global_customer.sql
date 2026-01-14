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
