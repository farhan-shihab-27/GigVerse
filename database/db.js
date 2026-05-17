//  MySQL Connection Pool 
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// ca.pem lives in the project root (alongside server.js and package.json).
// __dirname is reliable on both local dev and Vercel Serverless Functions.
// database/ is one level down from root, so we go up one directory.
const caPath = path.resolve(__dirname, '..', 'ca.pem');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || process.env.DB_DATABASE || 'defaultdb',

  // Connection Pool Tuning 
  waitForConnections: true,
  connectionLimit: 10,          // max simultaneous connections
  maxIdle: 5,           // max idle connections retained
  idleTimeout: 60000,       // close idle connections after 60s
  queueLimit: 0,           // unlimited queue 
  enableKeepAlive: true,        // prevent Aiven timeout disconnects
  keepAliveInitialDelay: 10000,    // first keep-alive probe after 10s

  // Aiven SSL
  ssl: {
    ca: fs.readFileSync(caPath),
    rejectUnauthorized: true,      // enforce certificate validation
  },

  // Timezone & Character Set 
  timezone: '+06:00',             // Bangladesh Standard Time
  charset: 'utf8mb4',            // full Unicode support
});

// Connection Verification + Safe Auto-Migration
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅  MySQL pool connected to Aiven (SSL verified)');
    conn.release();

    // ── Safe DB Migration: Ensure Notifications.Type column exists ───────────
    try {
      await pool.query(
        `ALTER TABLE Notifications ADD COLUMN Type VARCHAR(50) DEFAULT 'general'`
      );
      console.log('✅  DB Migration: Notifications.Type column added.');
    } catch (migrationErr) {
      if (migrationErr.code === 'ER_DUP_FIELDNAME' || migrationErr.errno === 1060) {
        console.log('✅  DB structure verified.');
      } else {
        console.warn('⚠️  DB Migration warning:', migrationErr.message);
      }
    }
  } catch (err) {
    console.error('❌  MySQL connection failed:', err.message);
  }
})();

module.exports = pool;
