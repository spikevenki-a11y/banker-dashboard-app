-- Locker allocation visual grid: add floor and section grouping columns
-- These allow lockers to be displayed grouped by floor and section (like cinema seating)

ALTER TABLE lockers
  ADD COLUMN IF NOT EXISTS floor_no VARCHAR(10) DEFAULT 'G',
  ADD COLUMN IF NOT EXISTS section  VARCHAR(20);

-- Composite index for grouped queries in the visual grid
CREATE INDEX IF NOT EXISTS idx_lockers_floor_section
  ON lockers(branch_id, floor_no, section);
