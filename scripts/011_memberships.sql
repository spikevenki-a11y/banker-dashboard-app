CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    customer_code BIGINT REFERENCES membermaster(customercode),

    branch_id BIGINT REFERENCES branchparameters(branch_id),

    membership_class CHAR(1) CHECK (membership_class IN ('A','B')),

    member_type VARCHAR(15) CHECK (member_type IN ('INDIVIDUAL','PLDB')),

    membership_no VARCHAR(30) UNIQUE NOT NULL,

    join_date DATE NOT NULL,
    close_date DATE,

    status VARCHAR(20) DEFAULT 'ACTIVE',

    created_at TIMESTAMP DEFAULT now()
);


CREATE TABLE membership_sequences (
    branch_id BIGINT PRIMARY KEY REFERENCES branchparameters(branch_id),
    last_number INT DEFAULT 0
);


CREATE OR REPLACE FUNCTION generate_membership_no(p_branch BIGINT)
RETURNS TEXT AS $$
DECLARE
  next_no INT;
BEGIN
  UPDATE membership_sequences
     SET last_number = last_number + 1
   WHERE branch_id = p_branch
   RETURNING last_number INTO next_no;

  IF next_no IS NULL THEN
     INSERT INTO membership_sequences(branch_id, last_number)
     VALUES (p_branch, 1)
     RETURNING last_number INTO next_no;
  END IF;

  RETURN p_branch || '-' || EXTRACT(YEAR FROM now())::INT || '-' ||
         LPAD(next_no::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;


ALTER TABLE memberships
ALTER COLUMN membership_no SET DEFAULT generate_membership_no(branch_id);
