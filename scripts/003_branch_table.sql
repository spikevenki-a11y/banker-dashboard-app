
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

