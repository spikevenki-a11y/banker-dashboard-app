-- global locker type master (for reference and standardization across branches)
CREATE TABLE locker_type_master (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_name     VARCHAR(50) NOT NULL UNIQUE,   -- Small, Medium, Large
    dimensions    VARCHAR(100),                  -- Standard size
    description   TEXT,
    created_at    TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

INSERT INTO locker_type_master (type_name, dimensions, description)
VALUES
('Extra Small', '8x6x4 inches',   'For minimal storage like jewelry'),
('Small',       '12x8x5 inches',  'Small valuables and documents'),
('Medium',      '18x12x8 inches', 'General purpose storage'),
('Large',       '24x18x12 inches','Large items and storage boxes'),
('Extra Large', '36x24x18 inches','Very large storage needs');

-- Lockers Module
-- Manages locker inventory, allocation, and deposits where interest = rent

-- Locker size / category types
CREATE TABLE locker_types (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    locker_type_id SERIAL        NOT NULL,
    branch_id      INTEGER       NOT NULL,
    type_name      VARCHAR(50)   NOT NULL,   -- e.g. Small, Medium, Large
    dimensions     VARCHAR(100),             -- e.g. "12x8x5 inches"
    no_of_lockers  INTEGER       NOT NULL DEFAULT 0,
    no_of_rows     INTEGER       NOT NULL DEFAULT 0,
    no_of_cabinets INTEGER       NOT NULL DEFAULT 0,
    annual_rent    NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at     TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
CREATE INDEX idx_ltype_branch ON locker_types(branch_id);

-- Individual locker units in the branch vault
CREATE TABLE lockers (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id      INTEGER     NOT NULL,
    locker_no      VARCHAR(20) NOT NULL,
    locker_type_id INTEGER     NOT NULL REFERENCES locker_types(locker_type_id),
    cabinet_no INTEGER,
    row_no INTEGER,
    column_no INTEGER
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE'
        CHECK (
            status IN (
                'AVAILABLE',
                'ALLOCATED',
                'RESERVED',
                'MAINTENANCE',
                'BLOCKED'
            )
        ),
    remarks TEXT,
    created_at     TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    CONSTRAINT uq_locker_no UNIQUE (branch_id, locker_no)
);
CREATE INDEX idx_lockers_branch ON lockers(branch_id);
CREATE INDEX idx_lockers_status ON lockers(status);

-- Locker deposit accounts (security deposit; interest earned = annual locker rent)
CREATE TABLE locker_deposits (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    account_number   VARCHAR(20)   NOT NULL UNIQUE,
    branch_id        INTEGER       NOT NULL,
    membership_no    BIGINT        NOT NULL,
    locker_id        UUID          REFERENCES lockers(id),
    deposit_amount   NUMERIC(12,2) NOT NULL,
    interest_rate    NUMERIC(6,3)  NOT NULL DEFAULT 0,
    opening_date     DATE          NOT NULL,
    period_years     SMALLINT      NOT NULL DEFAULT 1,
    expiry_date      DATE,
    nominee_name     VARCHAR(200),
    nominee_relation VARCHAR(50),
    status           VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | CLOSED
    created_at       TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at       TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
CREATE INDEX idx_ld_branch ON locker_deposits(branch_id);
CREATE INDEX idx_ld_member ON locker_deposits(membership_no);



INSERT INTO deposit_schemes (
    branch_id,scheme_id,scheme_name,scheme_description,deposit_type,minimum_period_months,maximum_period_months,installment_frequency,minimum_installment_amount,maximum_installment_amount,penal_rate,interest_rate,interest_code,interest_frequency,interest_calculation_method,compounding_frequency,premature_closure_allowed,premature_penal_rate,tds_applicable,deposit_gl_account,interest_payable_gl_account,interest_expense_gl_account
) VALUES (
    23108001,24001,'Locker Deposit','Locker Deposit lockers','LOCKER',12,120,'YEARLY',500.00,100000.00,2.00,7.00,0,'ON_MATURITY','COMPOUND','QUARTERLY',true,1.00,true,'12203000','0',    '41203000'
); 
create table public.locker_assignments (
  id uuid not null default gen_random_uuid (),
  locker_id uuid not null,
  membership_no numeric not null,
  assigned_date date not null,
  expiry_date date not null,
  annual_rent numeric(12, 2) not null,
  deposit_amount numeric(12, 2) null default 0,
  status character varying(20) not null default 'ACTIVE'::character varying,
  created_by uuid null,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  branch_id integer null,
  constraint locker_assignments_pkey primary key (id),
  constraint locker_assignments_locker_id_fkey foreign KEY (locker_id) references lockers (id),
  constraint locker_assignments_status_check check (
    (
      (status)::text = any (
        (
          array[
            'ACTIVE'::character varying,
            'EXPIRED'::character varying,
            'CLOSED'::character varying,
            'CANCELLED'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

CREATE TABLE locker_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id      INTEGER     NOT NULL,

    locker_id UUID NOT NULL
        REFERENCES lockers(id),

    membership_no numeric(12) NOT NULL,

    reserved_by INTEGER,

    reserved_at TIMESTAMP DEFAULT now(),

    expires_at TIMESTAMP NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (
            status IN (
                'ACTIVE',
                'EXPIRED',
                'CONVERTED',
                'CANCELLED'
            )
        )
);

CREATE TABLE locker_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id      INTEGER     NOT NULL,

    locker_id UUID NOT NULL
        REFERENCES lockers(id),

    start_date DATE NOT NULL,

    end_date DATE,

    reason TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
        CHECK (
            status IN (
                'OPEN',
                'COMPLETED'
            )
        ),

    created_by uuid,

    created_at TIMESTAMP DEFAULT now()
);


create table public.locker_assignment_history (
  id uuid not null default gen_random_uuid (),
  locker_id uuid not null,
  membership_no numeric not null,
  assigned_date date null,
  released_date date null,
  annual_rent numeric(12, 2) null,
  deposit_amount numeric(12, 2) null,
  action character varying(20) null,
  performed_by uuid null,
  created_at timestamp without time zone null default now(),
  branch_id numeric not null,
  constraint locker_assignment_history_pkey primary key (id),
  constraint locker_assignment_history_action_check check (
    (
      (action)::text = any (
        (
          array[
            'ASSIGNED'::character varying,
            'RENEWED'::character varying,
            'TRANSFERRED'::character varying,
            'RELEASED'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;