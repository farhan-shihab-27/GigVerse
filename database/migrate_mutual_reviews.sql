-- GigVerse: Mutual Feedback Migration
-- Adds RevieweeID to Reviews table and changes unique constraint
-- to (OrderID, ReviewerID) so both parties can review each other per order.
-- Run once against the live database.

SET FOREIGN_KEY_CHECKS = 0;

-- Step 1: Drop the old UNIQUE constraint on OrderID alone (if it exists).
-- We use IF EXISTS syntax via a conditional approach.
-- The old constraint was either a UNIQUE KEY or the PRIMARY KEY logic.
-- We'll drop it by name — the schema named it nothing explicitly, so MySQL
-- auto-named it. We ALTER to drop and re-add safely.

ALTER TABLE Reviews
  ADD COLUMN IF NOT EXISTS RevieweeID INT NULL
    AFTER ReviewerID,
  ADD CONSTRAINT fk_reviews_reviewee
    FOREIGN KEY (RevieweeID) REFERENCES Users(UserID)
    ON UPDATE CASCADE ON DELETE RESTRICT;

-- Step 2: Backfill RevieweeID for existing reviews from the Orders table
UPDATE Reviews r
JOIN Orders o ON r.OrderID = o.OrderID
SET r.RevieweeID = o.ContributorID
WHERE r.RevieweeID IS NULL;

-- Step 3: Drop the old UNIQUE constraint on OrderID alone.
-- Find the constraint name — it is 'OrderID' by default in InnoDB when
-- defined as UNIQUE in CREATE TABLE.
ALTER TABLE Reviews DROP INDEX IF EXISTS OrderID;

-- Step 4: Add new composite unique key so each reviewer can only post once per order.
ALTER TABLE Reviews
  ADD UNIQUE KEY uq_review_order_reviewer (OrderID, ReviewerID);

SET FOREIGN_KEY_CHECKS = 1;
