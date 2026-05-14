// ── GigVerse — Smart Tracking Migration Runner ──────────────────────────────
// Runs database/migrate_notifications_tracking.sql safely.
// Usage: node scripts/migrateTracking.js
require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const pool = require('../database/db');

const SQL_FILE = path.resolve(__dirname, '..', 'database', 'migrate_notifications_tracking.sql');

async function runMigration() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  GigVerse — Smart Tracking & Notification Migration');
  console.log('═══════════════════════════════════════════════════════════');

  const conn = await pool.getConnection();

  try {
    const raw = fs.readFileSync(SQL_FILE, 'utf-8');

    // ── Strategy ─────────────────────────────────────────────────────────
    // MySQL2 cannot execute DELIMITER blocks directly.
    // We extract stored procedure CREATE/CALL/DROP blocks and run them
    // using conn.query({ sql, ... }) with multiStatements where needed.
    // For everything else, we split on semicolons and run line by line.

    // Step 1: Run the Notifications column additions via direct ALTER
    console.log('\n[1/4] Adding Type & RelatedID columns to Notifications...');
    await safeAlter(conn, 'Notifications', 'Type',
      "ALTER TABLE Notifications ADD COLUMN Type VARCHAR(50) NOT NULL DEFAULT 'system' AFTER UserID");
    await safeAlter(conn, 'Notifications', 'RelatedID',
      "ALTER TABLE Notifications ADD COLUMN RelatedID INT NULL AFTER Type");
    console.log('  ✅  Notifications columns ready.');

    // Step 2: Create OrderMilestones table
    console.log('\n[2/4] Creating OrderMilestones table...');
    await conn.query(`
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
      ) ENGINE=InnoDB
    `);
    console.log('  ✅  OrderMilestones table ready.');

    // Step 3: Create OrderRevisions table
    console.log('\n[3/4] Creating OrderRevisions table...');
    await conn.query(`
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
      ) ENGINE=InnoDB
    `);
    console.log('  ✅  OrderRevisions table ready.');

    // Step 4: Add tracking columns to Orders
    console.log('\n[4/4] Adding tracking columns to Orders table...');
    await safeAlter(conn, 'Orders', 'AcceptedAt',
      'ALTER TABLE Orders ADD COLUMN AcceptedAt TIMESTAMP NULL AFTER CreatedAt');
    await safeAlter(conn, 'Orders', 'DeliveryDeadline',
      'ALTER TABLE Orders ADD COLUMN DeliveryDeadline TIMESTAMP NULL AFTER AcceptedAt');
    await safeAlter(conn, 'Orders', 'CurrentStep',
      'ALTER TABLE Orders ADD COLUMN CurrentStep INT NOT NULL DEFAULT 0 AFTER DeliveryDeadline');
    await safeAlter(conn, 'Orders', 'RevisionCount',
      'ALTER TABLE Orders ADD COLUMN RevisionCount INT NOT NULL DEFAULT 0 AFTER CurrentStep');
    console.log('  ✅  Orders tracking columns ready.');

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  ✅  ALL MIGRATIONS COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('\n❌  Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

/**
 * Safely adds a column to a table — ignores "Duplicate column name" errors.
 */
async function safeAlter(conn, table, column, sql) {
  try {
    await conn.query(sql);
    console.log(`     + ${table}.${column} added`);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME' || err.errno === 1060) {
      console.log(`     ⏭  ${table}.${column} already exists — skipped`);
    } else {
      throw err;
    }
  }
}

runMigration();
