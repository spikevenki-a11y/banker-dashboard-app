-- Land securities (security_type_id = 1): number of years the EC was obtained for.
ALTER TABLE security_property_details
  ADD COLUMN IF NOT EXISTS ec_years_obtained SMALLINT
    CHECK (ec_years_obtained IS NULL OR ec_years_obtained BETWEEN 1 AND 100);
