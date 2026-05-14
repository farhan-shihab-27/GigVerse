-- ============================================================
-- GigVerse — Smart Order Tracking & Notification Migration
-- Safe to run multiple times. Uses IF NOT EXISTS and
-- stored-procedure-based column existence checks.
-- DOES NOT touch, rename, or drop any existing tables.
-- ============================================================

-- ─── 1. Enhance Notifications table (add Type & RelatedID) ──

DROP PROCEDURE IF EXISTS _gv_add_notification_cols;
DELIMITER //
CREATE PROCEDURE _gv_add_notification_cols()
BEGIN
  -- Add Type column
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'Notifications'
      AND COLUMN_NAME  = 'Type'
  ) THEN
    ALTER TABLE Notifications
      ADD COLUMN Type VARCHAR(50) NOT NULL DEFAULT 'system' AFTER UserID;
  END IF;

  -- Add RelatedID column (references an Order, Review, Message, etc.)
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'Notifications'
      AND COLUMN_NAME  = 'RelatedID'
  ) THEN
    ALTER TABLE Notifications
      ADD COLUMN RelatedID INT NULL AFTER Type;
  END IF;
END //
DELIMITER ;

CALL _gv_add_notification_cols();
DROP PROCEDURE IF EXISTS _gv_add_notification_cols;


-- ─── 2. OrderMilestones table (4-step progress tracker) ─────

CREATE TABLE IF NOT EXISTS OrderMilestones (
  MilestoneID   INT            AUTO_INCREMENT PRIMARY KEY,
  OrderID       INT            NOT NULL,
  Step          INT            NOT NULL,
  Label         VARCHAR(100)   NOT NULL,
  CompletedAt   TIMESTAMP      NULL,
  CreatedAt     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_milestones_order
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX IF NOT EXISTS idx_milestones_order ON OrderMilestones (OrderID);


-- ─── 3. OrderRevisions table (revision history for disputes) ─

CREATE TABLE IF NOT EXISTS OrderRevisions (
  RevisionID    INT            AUTO_INCREMENT PRIMARY KEY,
  OrderID       INT            NOT NULL,
  RequestedBy   INT            NOT NULL,
  Reason        TEXT           NULL,
  CreatedAt     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_revisions_order
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_revisions_user
    FOREIGN KEY (RequestedBy) REFERENCES Users(UserID)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX IF NOT EXISTS idx_revisions_order ON OrderRevisions (OrderID);


-- ─── 4. Add tracking columns to Orders table ────────────────

DROP PROCEDURE IF EXISTS _gv_add_order_tracking_cols;
DELIMITER //
CREATE PROCEDURE _gv_add_order_tracking_cols()
BEGIN
  -- AcceptedAt: when the contributor accepts the order
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'Orders'
      AND COLUMN_NAME  = 'AcceptedAt'
  ) THEN
    ALTER TABLE Orders ADD COLUMN AcceptedAt TIMESTAMP NULL AFTER CreatedAt;
  END IF;

  -- DeliveryDeadline: auto-set when order is accepted
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'Orders'
      AND COLUMN_NAME  = 'DeliveryDeadline'
  ) THEN
    ALTER TABLE Orders ADD COLUMN DeliveryDeadline TIMESTAMP NULL AFTER AcceptedAt;
  END IF;

  -- CurrentStep: which milestone step the order is on (0–4)
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'Orders'
      AND COLUMN_NAME  = 'CurrentStep'
  ) THEN
    ALTER TABLE Orders ADD COLUMN CurrentStep INT NOT NULL DEFAULT 0 AFTER DeliveryDeadline;
  END IF;

  -- RevisionCount: number of revision requests (for compensation math)
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'Orders'
      AND COLUMN_NAME  = 'RevisionCount'
  ) THEN
    ALTER TABLE Orders ADD COLUMN RevisionCount INT NOT NULL DEFAULT 0 AFTER CurrentStep;
  END IF;
END //
DELIMITER ;

CALL _gv_add_order_tracking_cols();
DROP PROCEDURE IF EXISTS _gv_add_order_tracking_cols;


-- ─── Done ────────────────────────────────────────────────────
-- Migration complete. All changes are safe and idempotent.
