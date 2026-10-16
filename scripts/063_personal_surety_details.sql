-- =========================================================
-- Personal Surety Details Stored Procedure
-- if loan security is personal surety, this table will store the details of the surety
-- =========================================================
create table if not exists personal_surety_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_application_id BIGINT not null references loan_applications(loan_application_id),
    membership_no VARCHAR(30) not null references memberships(membership_no),
    surety_customer_code BIGINT not null references customers(customer_code),
    surety_annual_income NUMERIC(15,2) not null,
    surety_eligible_security_amount NUMERIC(15,2) not null,
    created_at TIMESTAMP DEFAULT now()
)