-- =============================================================
-- Customer photo & signature
-- Tables : customer_documents
--
-- Stores the member/customer photo and signature uploaded from
-- Create Customer and Member Management → View Member → Edit Member.
-- Files live in the private Supabase Storage bucket "customer-documents"
-- (created automatically on first upload) and are only served through
-- the authenticated API route /api/customers/documents/file.
-- =============================================================

CREATE TABLE IF NOT EXISTS customer_documents (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code  CHARACTER(8)  NOT NULL
                   REFERENCES customers(customer_code),
  branch_id      BIGINT,
  document_type  VARCHAR(20)   NOT NULL
                   CHECK (document_type IN ('PHOTO', 'SIGNATURE')),
  file_name      TEXT          NOT NULL,
  file_type      VARCHAR(50)   NOT NULL,
  file_size      BIGINT        NOT NULL,
  storage_path   TEXT          NOT NULL,
  -- Replaced images are kept for audit with is_active = false
  is_active      BOOLEAN       NOT NULL DEFAULT true,
  uploaded_by    UUID,
  created_at     TIMESTAMP     NOT NULL DEFAULT now(),
  updated_at     TIMESTAMP     NOT NULL DEFAULT now()
);

-- At most one active photo and one active signature per customer
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_documents_active
  ON customer_documents (customer_code, document_type)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_customer_documents_customer
  ON customer_documents (customer_code);

-- =============================================================
-- END OF MIGRATION
-- =============================================================
