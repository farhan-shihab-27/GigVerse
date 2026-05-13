// Escrow migration runner — adds payment columns to Orders table
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || process.env.DB_DATABASE,
    ssl: {
      ca: fs.readFileSync(path.resolve(__dirname, '..', 'ca.pem')),
      rejectUnauthorized: true,
    },
    multipleStatements: true,
  });

  console.log('Connected to Aiven MySQL. Running escrow migration...');

  const alterations = [
    { sql: "ALTER TABLE Orders ADD COLUMN payment_method ENUM('bkash','nagad','rocket','bank') NULL AFTER PaymentStatus", label: 'payment_method' },
    { sql: "ALTER TABLE Orders ADD COLUMN sender_account_no VARCHAR(50) NULL AFTER payment_method", label: 'sender_account_no' },
    { sql: "ALTER TABLE Orders ADD COLUMN sender_bank_name VARCHAR(100) NULL AFTER sender_account_no", label: 'sender_bank_name' },
    { sql: "ALTER TABLE Orders ADD COLUMN transaction_id VARCHAR(100) NULL AFTER sender_bank_name", label: 'transaction_id' },
    { sql: "ALTER TABLE Orders ADD UNIQUE INDEX idx_orders_txn (transaction_id)", label: 'idx_orders_txn' },
  ];

  for (const { sql, label } of alterations) {
    try {
      await conn.query(sql);
      console.log(`  ✅ Added: ${label}`);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_DUP_KEYNAME') {
        console.log(`  ⏭️  Skipped (already exists): ${label}`);
      } else {
        throw e;
      }
    }
  }

  // Verify
  const [cols] = await conn.query("SHOW COLUMNS FROM Orders");
  console.log('\nOrders table columns:');
  cols.forEach(c => console.log(`  - ${c.Field} (${c.Type})`));

  console.log('\n✅ Migration complete!');
  await conn.end();
  process.exit(0);
})().catch(e => {
  console.error('❌ Migration failed:', e.message);
  process.exit(1);
});
