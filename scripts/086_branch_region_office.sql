-- Regional Office name printed on the Day Book header ("R.O : Salem")
ALTER TABLE branchparameters ADD COLUMN IF NOT EXISTS region_office VARCHAR(100);

-- Set it for your branch, e.g.:
-- UPDATE branchparameters SET region_office = 'Salem' WHERE branch_id = <your branch_id>;
