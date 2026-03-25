-- Add voucher_type column to borrowing_transactions for Cash/Transfer selection
ALTER TABLE borrowing_transactions
ADD COLUMN IF NOT EXISTS voucher_type VARCHAR(20) DEFAULT 'CASH';
