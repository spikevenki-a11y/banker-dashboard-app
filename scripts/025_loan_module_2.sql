create table loan_purpose_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purpose_id int not null unique,
    purpose_name varchar(255) not null,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
insert into loan_purpose_master (purpose_id, purpose_name) values
(1, 'Working Capital'),
(2, 'Term Loan'),
(3, 'Project Finance'),
(4, 'Personal Loan'),
(5, 'Education Loan'),
(6, 'Home Loan'),
(7, 'Vehicle Loan'),
(8, 'Agricultural Loan'),
(9, 'Microfinance Loan'),
(10, 'Gold'),
(11, 'Other');

create table loan_scheme_purpose_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id int not null,
    scheme_id int not null,
    purpose_id int not null,
    foreign key (branch_id) references branchparameters(branch_id),
    foreign key (purpose_id) references loan_purpose_master(purpose_id)
);

insert into loan_scheme_purpose_mapping (branch_id, scheme_id, purpose_id) values
(23108001, 501, 9),
(23108001, 501,11);

create table public.loan_scheme_security_master (
  id uuid not null default gen_random_uuid (),
  security_id integer not null,
  security_name character varying(255) not null,
  created_date timestamp with time zone null default now(),
  security_code character varying(20) null,
  is_active boolean not null default true,
  requires_valuation boolean not null default true,
  revaluation_days integer null,
  constraint loan_scheme_security_master_pkey primary key (id),
  constraint loan_scheme_security_master_security_id_key unique (security_id)
) TABLESPACE pg_default;

INSERT INTO public.loan_scheme_security_master (id, security_id, security_name, created_date, security_code, is_active, requires_valuation, revaluation_days)
 VALUES ('f5ce8d18-4001-4bbe-b84d-aa01cb198b35', 1, 'Land', '2026-03-19 13:17:03.763426+00', 'LAND', true, true, 180), 
 ('49b7af9e-8acb-444f-a4b2-8eff6fb9118f', 2, 'Building', '2026-03-19 13:17:03.763426+00', 'BUILDING', true, true, 180), 
 ('ef325f0b-89d5-46aa-8331-6bae93d4bb1e', 3, 'Machinery', '2026-03-19 13:17:03.763426+00', 'MACHNY', true, true, null), 
 ('fa869ccb-ad4d-4d0f-9238-d1d98cd26e65', 4, 'Inventory', '2026-03-19 13:17:03.763426+00', 'INVENT', true, true, null), 
 ('3220fd03-3ed3-4a7e-ad16-cf654c22348e', 5, 'Accounts Receivable', '2026-03-19 13:17:03.763426+00', 'AR', true, true, null), 
 ('edc34c69-a1f2-4ca8-bff3-85e3649fe974', 6, 'Gold', '2026-03-19 13:17:03.763426+00', 'GOLD', true, true, 90), 
 ('19edb494-169c-4e7d-aaf1-2d6de69f7fab', 7, 'Vehicle', '2026-03-19 13:17:03.763426+00', 'VEHICLE', true, true, 365), 
 ('bd4aafd2-03f4-4dda-b014-209cf8f0d639', 8, 'Deposit', '2026-03-19 13:17:03.763426+00', 'DEPOSIT', true, false, null), 
 ('b078bc0d-85ef-4952-b8c8-5e07631ef1e6', 9, 'Other', '2026-04-22 13:09:57.660719+00', 'OTHER', true, true, null), 
 ('55766fe1-2a41-4e61-99ef-1050e373a5a8', 10, 'Insurance Policy', '2026-04-22 14:14:57.98904+00', 'INSUR', true, true, 365), 
 ('ba9c7d56-7513-4f24-96c1-36b6aa1c8833', 11, 'Shares / Stocks', '2026-04-22 14:14:57.98904+00', 'SHARES', true, true, 30), 
 ('9ef390c5-ffc7-4af0-a5e6-550929bc26cb', 12, 'NSC / KVP', '2026-04-22 14:14:57.98904+00', 'NSC_KVP', true, false, null), 
 ('8dee4ce7-f96c-4525-8e88-a05e9d667248', 13, 'Personal Surety', '2026-10-16 01:36:36.726612+00', 'PER_SUR', true, true, null);

create table loan_scheme_security_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id int not null,
    scheme_id int not null,
    security_id int not null,
    foreign key (branch_id) references branchparameters(branch_id),
    foreign key (security_id) references security_master(security_id)
);

insert into loan_scheme_security_mapping (branch_id, scheme_id, security_id) values
(23108001, 501, 8);

CREATE TABLE security_details (
    branch_id INT,
    account_number VARCHAR(50),
    security_type VARCHAR(50),
    security_detail VARCHAR(100),  -- 4th column (flexible)
    security_value DECIMAL(15,2),
    maximum_allowed_amount DECIMAL(15,2)
);
