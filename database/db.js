// ── MySQL Connection Pool (promise‑based, Aiven SSL) ────────
const fs   = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// ca.pem lives alongside package.json in the project root
const caPath = path.join(process.cwd(), 'ca.pem');

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'defaultdb',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  ssl: {
    ca: fs.readFileSync(caPath),
  },
});

module.exports = pool;
