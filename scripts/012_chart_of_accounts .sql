ALTER TABLE generalledgeraccounts RENAME TO chart_of_accounts;
-- Renaming the table generalledgeraccounts to chart_of_accounts for better clarity and alignment with accounting terminology.

CREATE TABLE gl_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id BIGINT REFERENCES branchparameters(branch_id),
  batch_ref_no TEXT,
  narration TEXT,
  maker_id UUID,
  checker_id UUID,
  status VARCHAR(15) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT now(),
  approved_at TIMESTAMP
);
-- Created gl_batches table to manage batches of general ledger transactions with relevant metadata.
CREATE TABLE gl_batch_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES gl_batches(id),
  accountcode BIGINT,
  dr_amount NUMERIC(18,2) DEFAULT 0,
  cr_amount NUMERIC(18,2) DEFAULT 0,
  CHECK (dr_amount = 0 OR cr_amount = 0)
);
ALTER TABLE gl_batch_lines
ADD COLUMN txn_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE gl_batch_lines
ADD COLUMN voucher_no VARCHAR(30) NOT NULL;


CREATE TABLE gl_voucher_sequences (
  branch_id BIGINT,
  voucher_type CHAR(2),
  business_date DATE,
  last_no INT,
  PRIMARY KEY (branch_id,voucher_type,business_date)
);

-- RV = Receipt Voucher
-- PV = Payment Voucher
-- JV = Journal Voucher
-- CV = Contra Voucher

CREATE OR REPLACE FUNCTION generate_voucher_no(
  p_branch BIGINT,
  p_type CHAR(2),
  p_date DATE
) RETURNS TEXT AS $$
DECLARE
  next_no INT;
BEGIN
  UPDATE gl_voucher_sequences
     SET last_no = last_no + 1
   WHERE branch_id=p_branch AND voucher_type=p_type AND business_date=p_date
   RETURNING last_no INTO next_no;

  IF next_no IS NULL THEN
    INSERT INTO gl_voucher_sequences VALUES(p_branch,p_type,p_date,1)
    RETURNING last_no INTO next_no;
  END IF;

  RETURN p_branch || '/' || to_char(p_date,'YYYYMMDD') || '/' || p_type || '/' ||
         LPAD(next_no::TEXT,6,'0');
END;
$$ LANGUAGE plpgsql;


-- Created gl_batch_lines table to store individual transaction lines within a GL batch, ensuring either debit or credit amount is recorded, not both.
CREATE RULE no_update_gl_batches AS ON UPDATE TO gl_batches DO INSTEAD NOTHING;
CREATE RULE no_delete_gl_batches AS ON DELETE TO gl_batches DO INSTEAD NOTHING;
CREATE RULE no_update_gl_lines AS ON UPDATE TO gl_batch_lines DO INSTEAD NOTHING;
CREATE RULE no_delete_gl_lines AS ON DELETE TO gl_batch_lines DO INSTEAD NOTHING;
-- Added rules to prevent updates and deletions on gl_batches and gl_batch_lines tables to maintain data integrity.
CREATE OR REPLACE FUNCTION post_gl_batch(p_batch UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE chart_of_accounts a
     SET accountbalance = accountbalance + l.dr_amount - l.cr_amount
    FROM gl_batch_lines l
   WHERE l.batch_id = p_batch
     AND a.accountcode = l.accountcode;

  UPDATE gl_batches SET status='POSTED', approved_at=now()
  WHERE id = p_batch;
END;
$$ LANGUAGE plpgsql;
-- Created function post_gl_batch to update account balances based on the transactions in a GL batch and mark the batch as posted.
CREATE OR REPLACE FUNCTION reverse_gl_batch(p_batch UUID)
RETURNS UUID AS $$
DECLARE new_batch UUID;
BEGIN
  INSERT INTO gl_batches(branch_id,narration,status)
  SELECT branch_id,'REVERSAL', 'APPROVED'
  FROM gl_batches WHERE id=p_batch
  RETURNING id INTO new_batch;

  INSERT INTO gl_batch_lines(batch_id,accountcode,dr_amount,cr_amount)
  SELECT new_batch,accountcode,cr_amount,dr_amount
  FROM gl_batch_lines WHERE batch_id=p_batch;

  PERFORM post_gl_batch(new_batch);
  RETURN new_batch;
END;
$$ LANGUAGE plpgsql;
-- Created function reverse_gl_batch to create a reversal batch for a given GL batch and post it, effectively negating the original transactions.

CREATE TABLE day_end_balances (
  branch_id BIGINT,
  accountcode BIGINT,
  business_date DATE,
  closing_balance NUMERIC(18,2),
  PRIMARY KEY (branch_id,accountcode,business_date)
);


CREATE OR REPLACE FUNCTION seal_day_end(p_branch BIGINT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO day_end_balances(branch_id,accountcode,business_date,closing_balance)
  SELECT branch_id,accountcode,CURRENT_DATE,accountbalance
  FROM chart_of_accounts WHERE branch_id=p_branch;
END;
$$ LANGUAGE plpgsql;
-- Created day_end_balances table and seal_day_end function to record closing balances of accounts at the end of each business day for a branch.