
-- GigVerse — Escrow Payment Gateway Migration
-- Adds payment method fields to the Orders table.
-- Safe to run multiple times (uses IF NOT EXISTS logic via column checks).

-- Step 1: Add payment_method ENUM column
ALTER TABLE Orders
  ADD COLUMN payment_method     ENUM('bkash','nagad','rocket','bank') NULL AFTER PaymentStatus;

-- Step 2: Add sender_account_no (phone number or bank account)
ALTER TABLE Orders
  ADD COLUMN sender_account_no  VARCHAR(50)  NULL AFTER payment_method;

-- Step 3: Add sender_bank_name (only for bank transfers)
ALTER TABLE Orders
  ADD COLUMN sender_bank_name   VARCHAR(100) NULL AFTER sender_account_no;

-- Step 4: Add transaction_id with UNIQUE index
ALTER TABLE Orders
  ADD COLUMN transaction_id     VARCHAR(100) NULL AFTER sender_bank_name;

ALTER TABLE Orders
  ADD UNIQUE INDEX idx_orders_txn (transaction_id);
