// GigVerse — Milestone Escrow Schema Migration
// Safely adds milestone_count, current_milestone to Orders
// and adds Status, AmountPercent, AmountTaka, ReleasedTransactionId to OrderMilestones.
// Idempotent: re-running this script will not fail if columns already exist.
require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
  let connection;
  try {
    console.log('⏳ Connecting to Aiven Database...');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 17474,
      ssl: { rejectUnauthorized: false },
      multipleStatements: true,
    });

    console.log('✅ Connected. Running milestone escrow migration...');

    //  1. Ensure OrderMilestones table exists 
    await connection.query(`
      CREATE TABLE IF NOT EXISTS OrderMilestones (
        MilestoneID         INT          AUTO_INCREMENT PRIMARY KEY,
        OrderID             INT          NOT NULL,
        Step                INT          NOT NULL,
        Label               VARCHAR(200) NOT NULL,
        Description         TEXT         NULL,
        AmountPercent       INT          NOT NULL DEFAULT 25,
        AmountTaka          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        Status              ENUM('pending','submitted_by_freelancer','approved_by_client','funds_released')
                            NOT NULL DEFAULT 'pending',
        ReleasedTransactionId VARCHAR(100) NULL,
        CompletedAt         DATETIME     NULL,
        ApprovedAt          DATETIME     NULL,
        CreatedAt           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_om_order (OrderID),
        INDEX idx_om_status (Status),
        CONSTRAINT fk_om_order FOREIGN KEY (OrderID) REFERENCES Orders(OrderID)
          ON UPDATE CASCADE ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    console.log('  ✓ OrderMilestones table ensured.');

    // 2. Safely add missing columns to OrderMilestones 
    const columnsToAdd = [
      { name: 'Description',         sql: "ADD COLUMN Description TEXT NULL AFTER Label" },
      { name: 'AmountPercent',       sql: "ADD COLUMN AmountPercent INT NOT NULL DEFAULT 25 AFTER Description" },
      { name: 'AmountTaka',          sql: "ADD COLUMN AmountTaka DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER AmountPercent" },
      { name: 'Status',             sql: "ADD COLUMN Status ENUM('pending','submitted_by_freelancer','approved_by_client','funds_released') NOT NULL DEFAULT 'pending' AFTER AmountTaka" },
      { name: 'ReleasedTransactionId', sql: "ADD COLUMN ReleasedTransactionId VARCHAR(100) NULL AFTER Status" },
      { name: 'ApprovedAt',         sql: "ADD COLUMN ApprovedAt DATETIME NULL AFTER CompletedAt" },
    ];

    for (const col of columnsToAdd) {
      try {
        await connection.query(`ALTER TABLE OrderMilestones ${col.sql}`);
        console.log(`  ✓ Added column: ${col.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`  → Column ${col.name} already exists, skipping.`);
        } else {
          console.error(`  ✗ Error adding ${col.name}:`, err.message);
        }
      }
    }

    //  3. Add milestone tracking columns to Orders table 
    const orderColumns = [
      { name: 'MilestoneCount',   sql: "ADD COLUMN MilestoneCount INT NOT NULL DEFAULT 4 AFTER PaymentStatus" },
      { name: 'CurrentMilestone', sql: "ADD COLUMN CurrentMilestone INT NOT NULL DEFAULT 0 AFTER MilestoneCount" },
      { name: 'EscrowReleased',   sql: "ADD COLUMN EscrowReleased DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER CurrentMilestone" },
      { name: 'AcceptedAt',       sql: "ADD COLUMN AcceptedAt DATETIME NULL AFTER EscrowReleased" },
      { name: 'DeliveryDeadline', sql: "ADD COLUMN DeliveryDeadline DATETIME NULL AFTER AcceptedAt" },
      { name: 'CurrentStep',      sql: "ADD COLUMN CurrentStep INT NOT NULL DEFAULT 0 AFTER DeliveryDeadline" },
      { name: 'RevisionCount',    sql: "ADD COLUMN RevisionCount INT NOT NULL DEFAULT 0 AFTER CurrentStep" },
    ];

    for (const col of orderColumns) {
      try {
        await connection.query(`ALTER TABLE Orders ${col.sql}`);
        console.log(`  ✓ Added column to Orders: ${col.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`  → Orders.${col.name} already exists, skipping.`);
        } else {
          console.error(`  ✗ Error adding Orders.${col.name}:`, err.message);
        }
      }
    }

    //  4. Add WalletBalance column to Users (simulated escrow wallet) 
    try {
      await connection.query(
        `ALTER TABLE Users ADD COLUMN WalletBalance DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER PVP_Points`
      );
      console.log('  ✓ Added column to Users: WalletBalance');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('  → Users.WalletBalance already exists, skipping.');
      } else {
        console.error('  ✗ Error adding Users.WalletBalance:', err.message);
      }
    }

    //  5. Ensure OrderRevisions table exists 
    await connection.query(`
      CREATE TABLE IF NOT EXISTS OrderRevisions (
        RevisionID   INT       AUTO_INCREMENT PRIMARY KEY,
        OrderID      INT       NOT NULL,
        RequestedBy  INT       NOT NULL,
        Reason       TEXT      NULL,
        CreatedAt    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_or_order (OrderID),
        CONSTRAINT fk_or_order FOREIGN KEY (OrderID) REFERENCES Orders(OrderID)
          ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_or_user FOREIGN KEY (RequestedBy) REFERENCES Users(UserID)
          ON UPDATE CASCADE ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    console.log('  ✓ OrderRevisions table ensured.');

    //  5. Backfill AmountTaka for existing milestones 
    await connection.query(`
      UPDATE OrderMilestones om
      JOIN Orders o ON om.OrderID = o.OrderID
      SET om.AmountTaka = ROUND(o.Amount * om.AmountPercent / 100, 2)
      WHERE om.AmountTaka = 0 AND o.Amount > 0
    `);
    console.log('  ✓ Backfilled AmountTaka for existing milestones.');

    console.log('\n🎉 Milestone Escrow Migration Complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ MIGRATION ERROR:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runMigration();
