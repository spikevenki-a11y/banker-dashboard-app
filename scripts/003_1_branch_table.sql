-- ============================================================================
-- TABLE: Branch
-- ============================================================================
-- PURPOSE:
--   Stores branch information for the banking system, including branch details,
--   location, and contact information.
-- NOTES:
--   - All branch codes must be unique across the system
--   - Timestamps are automatically maintained by the application
--   - Soft delete pattern used via IsActive flag
-- ============================================================================

CREATE TABLE branchparameters (
  branch_id INT PRIMARY KEY,
  branch_name NVARCHAR(100) NOT NULL,
  bank_name NVARCHAR(100) NOT NULL,
  branch_code NVARCHAR(10) UNIQUE NOT NULL,
  bank_type NVARCHAR(1) NOT NULL,
  is_head_office BIT NOT NULL DEFAULT 0,
  address NVARCHAR(255) NOT NULL,
  city NVARCHAR(50) NOT NULL,
  state NVARCHAR(50) NOT NULL,
  postal_code NVARCHAR(10),
  phone_number NVARCHAR(20),
  email NVARCHAR(100),
  created_date DATETIME DEFAULT GETDATE(),
  modified_date DATETIME DEFAULT GETDATE()
);



ALTER TABLE branchparameters ENABLE ROW LEVEL SECURITY;
-- RLS Policies for branchparameters table


alter table public.branchparameters
  add column statecode int,
  add column districtcode int,
  add column branchtypecode int,
  add column branchcode int;


  alter table public.branchparameters
  add column sldbcode bigint;

CREATE table hierarchy_level (
   hierarchy_level SMALLINT PRIMARY KEY,
   legal_entity_type VARCHAR(10) UNIQUE NOT NULL,
   meaning NVARCHAR(100) NOT NULL
);

ALTER TABLE branchparameters
   ADD COLUMN hierarchy_level SMALLINT CHECK (hierarchy_level IN (1,2,3)),
   ADD COLUMN parent_branch_id BIGINT REFERENCES branchparameters(branch_id),
   ADD COLUMN legal_entity_type VARCHAR(10) CHECK (legal_entity_type IN ('SLDB','DLDB','PLDB')),
   ADD COLUMN is_active BOOLEAN DEFAULT true;


-- Hierarchy Meaning
-- | hierarchy_level | legal_entity_type | Meaning           |
-- | --------------- | ----------------- | ----------------- |
-- | 1               | SLDB              | State Head Office |
-- | 2               | DLDB              | District LDB      |
-- | 3               | PLDB              | Primary LDB       |




CREATE OR REPLACE FUNCTION enforce_ldb_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.hierarchy_level = 1 AND NEW.parent_branch_id IS NOT NULL THEN
     RAISE EXCEPTION 'SLDB cannot have parent';
  END IF;

  IF NEW.hierarchy_level = 2 THEN
     IF (SELECT hierarchy_level FROM branchparameters WHERE branch_id = NEW.parent_branch_id) <> 1 THEN
        RAISE EXCEPTION 'DLDB must belong to SLDB';
     END IF;
  END IF;

  IF NEW.hierarchy_level = 3 THEN
     IF (SELECT hierarchy_level FROM branchparameters WHERE branch_id = NEW.parent_branch_id) <> 2 THEN
        RAISE EXCEPTION 'PLDB must belong to DLDB';
     END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_enforce_ldb_hierarchy
BEFORE INSERT OR UPDATE ON branchparameters
FOR EACH ROW EXECUTE FUNCTION enforce_ldb_hierarchy();


