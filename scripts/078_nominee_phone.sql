-- Nominee Details: nominee phone number (Savings, Fixed Deposits, New Membership).
-- Existing nominees keep NULL until their details are edited.
ALTER TABLE public.nominee_details
  ADD COLUMN IF NOT EXISTS nominee_phone VARCHAR(15);
