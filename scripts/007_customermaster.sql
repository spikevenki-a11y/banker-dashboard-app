-- create table public.customermaster (
--   customercode bigint not null,
--   customername varchar(200) not null,
--   fathername varchar(200),
--   mothername varchar(200),
--   dateofbirth date,
--   gender varchar(10),
--   maritalstatus varchar(20),
--   religion varchar(50),
--   community varchar(50),
--   caste varchar(50),
--   statename varchar(100),
--   districtname varchar(100),
--   talukname varchar(100),
--   villagecode int,
--   addressline1 varchar(255),
--   addressline2 varchar(255),
--   postalcode varchar(10),
--   phonenumber varchar(20),
--   email varchar(100),
--   aadhaarnumber varchar(12),
--   pannumber varchar(10),
--   voterid varchar(15),
--   rationcardnumber varchar(15),
--   isactive bit not null default b'1',
--   createddate timestamp with time zone,
--   modifieddate timestamp with time zone
-- ) tablespace pg_default;

  


-- CREATE SEQUENCE public.customercode_seq
-- START 1
-- INCREMENT 1
-- MINVALUE 1
-- MAXVALUE 999999
-- CACHE 1;




-- ALTER TABLE public.customermaster
-- ALTER COLUMN customercode
-- SET DEFAULT (
--   ('23' || lpad(nextval('public.customercode_seq')::text, 6, '0'))::bigint
-- );


-- ALTER TABLE public.customermaster
-- ALTER COLUMN customercode SET NOT NULL;

-- ALTER TABLE public.customermaster
-- ADD CONSTRAINT customermaster_pkey PRIMARY KEY (customercode);
