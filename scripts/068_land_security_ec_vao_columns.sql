-- Land securities (security_type_id = 1): EC period, VAO details and revenue village.
ALTER TABLE security_property_details
  ADD COLUMN IF NOT EXISTS ec_date_from    DATE,
  ADD COLUMN IF NOT EXISTS ec_date_to      DATE,
  ADD COLUMN IF NOT EXISTS vao_details     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS revenue_village VARCHAR(150);
