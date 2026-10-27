-- Land securities (security_type_id = 1) no longer capture Property Type.
-- Allow property_type to be NULL. Existing rows are left unchanged.
ALTER TABLE security_property_details
  ALTER COLUMN property_type DROP NOT NULL;
