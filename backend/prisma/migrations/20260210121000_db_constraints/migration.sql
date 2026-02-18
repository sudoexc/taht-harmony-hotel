-- DB-level constraints and overlap protection

-- Enable extension for exclusion constraints on UUID/text
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Ensure valid date range
ALTER TABLE "Stay"
  ADD CONSTRAINT "Stay_check_dates" CHECK ("checkOutDate" > "checkInDate") NOT VALID;

-- Prevent overlapping stays per room (except cancelled)
ALTER TABLE "Stay"
  ADD CONSTRAINT "Stay_no_overlap" EXCLUDE USING gist (
    "roomId" WITH =,
    daterange("checkInDate", "checkOutDate", '[)') WITH &&
  ) WHERE ("status" <> 'CANCELLED');

-- Amounts must be positive
ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_amount_positive" CHECK ("amount" > 0) NOT VALID;

ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_amount_positive" CHECK ("amount" > 0) NOT VALID;
