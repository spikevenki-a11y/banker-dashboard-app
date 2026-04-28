-- Add alternative mobile number to customers
ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS alt_mobile_no character varying(15);