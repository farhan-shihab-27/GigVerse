require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
    try {
        console.log("⏳ Connecting to Aiven Database...");

        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 17474,
            ssl: { rejectUnauthorized: false },
            multipleStatements: true // Permission to run multiple SQL queries at once
        });

        // The exact SQL query provided by Opus
        const sql = `
            ALTER TABLE Orders ADD COLUMN payment_method ENUM('bkash','nagad','rocket','bank') NULL AFTER PaymentStatus;
            ALTER TABLE Orders ADD COLUMN sender_account_no VARCHAR(50) NULL AFTER payment_method;
            ALTER TABLE Orders ADD COLUMN sender_bank_name VARCHAR(100) NULL AFTER sender_account_no;
            ALTER TABLE Orders ADD COLUMN transaction_id VARCHAR(100) NULL AFTER sender_bank_name;
            ALTER TABLE Orders ADD UNIQUE INDEX idx_orders_txn (transaction_id);
        `;

        await connection.query(sql);
        console.log("✅ SUCCESS: Migration complete! New columns added to the Orders table.");

        process.exit(0);
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log("✅ NOTICE: Columns already exist in the database. No new updates needed.");
        } else {
            console.error("❌ ERROR:", error.message);
        }
        process.exit(1);
    }
}

runMigration();