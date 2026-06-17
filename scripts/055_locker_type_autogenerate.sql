-- Locker type auto-generation: ensure columns exist for bulk locker creation
-- When a locker type is created with row/cabinet config, lockers are auto-generated

ALTER TABLE locker_types
  ADD COLUMN IF NOT EXISTS no_of_lockers  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_of_rows     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_of_cabinets INTEGER NOT NULL DEFAULT 0;

-- Ensure lockers has row and cabinet tracking columns
ALTER TABLE lockers
  ADD COLUMN IF NOT EXISTS row_no     INTEGER,
  ADD COLUMN IF NOT EXISTS cabinet_no INTEGER;
