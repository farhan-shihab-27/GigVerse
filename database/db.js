// ── MySQL Connection Pool (promise‑based, Aiven SSL) ────────
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// ca.pem lives alongside package.json in the project root
const caPath = path.join(process.cwd(), 'ca.pem');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'defaultdb',

  // ── Connection Pool Tuning ──────────────────────────────
  waitForConnections: true,
  connectionLimit: 10,          // max simultaneous connections
  maxIdle: 5,           // max idle connections retained
  idleTimeout: 60000,       // close idle connections after 60s
  queueLimit: 0,           // unlimited queue (fail-fast disabled)
  enableKeepAlive: true,        // prevent Aiven timeout disconnects
  keepAliveInitialDelay: 10000,    // first keep-alive probe after 10s

  // ── Aiven SSL (mandatory) ──────────────────────────────
  ssl: {
    ca: fs.readFileSync(caPath),
    rejectUnauthorized: true,      // enforce certificate validation
  },

  // ── Timezone & Character Set ───────────────────────────
  timezone: '+06:00',             // Bangladesh Standard Time
  charset: 'utf8mb4',            // full Unicode support
});

// ── Connection Verification (runs once on import) ─────────
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅  MySQL pool connected to Aiven (SSL verified)');
    conn.release();
  } catch (err) {
    console.error('❌  MySQL connection failed:', err.message);
  }
})();

module.exports = pool;
