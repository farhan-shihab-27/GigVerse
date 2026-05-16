// ── GigVerse — Fix Messages.Content Column Size ─────────────────────────────
// MySQL TEXT has a 64KB limit which truncates base64-encoded voice/file data.
// This migration upgrades the column to LONGTEXT (4GB) so media messages
// stored as inline base64 JSON can be persisted without truncation.
require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
  let connection;
  try {
    console.log('⏳ Connecting to database...');
    connection = await mysql.createConnection({
      host:     process.env.DB_HOST,
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port:     process.env.DB_PORT || 17474,
      ssl:      { rejectUnauthorized: false },
    });

    console.log('🔧 Upgrading Messages.Content from TEXT to LONGTEXT...');
    await connection.query('ALTER TABLE Messages MODIFY COLUMN Content LONGTEXT NOT NULL');
    console.log('✅ SUCCESS: Messages.Content is now LONGTEXT — voice notes and files will persist correctly.');

    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runMigration();
