-- =============================================================
-- Additional KYC document types: Passport, EB Bill, Others
-- Alters : customer_kycdetails
--
-- Used by Create Customer (KYC Details) and
-- Member Management → View Member (KYC tab / Edit Member → KYC).
-- =============================================================

ALTER TABLE customer_kycdetails
  ADD COLUMN IF NOT EXISTS passport_no          VARCHAR(20),
  -- EB (electricity board) service connection / consumer number
  ADD COLUMN IF NOT EXISTS eb_bill_no           VARCHAR(30),
  -- "Others": any other identity/address document, with its name
  ADD COLUMN IF NOT EXISTS other_document_name  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS other_document_no    VARCHAR(50);

-- =============================================================
-- END OF MIGRATION
-- =============================================================
