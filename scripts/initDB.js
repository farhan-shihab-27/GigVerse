// ── Run schema.sql against the configured MySQL instance ────
const fs   = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  /* Connect WITHOUT selecting a database first so the CREATE DATABASE
     statement inside schema.sql can execute. */
  const connection = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,          // allow full script execution
  });

  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('⏳  Running schema.sql …');
  await connection.query(sql);
  console.log('✅  Database "gigverse" initialised successfully.');

  await connection.end();
  process.exit(0);
})().catch((err) => {
  console.error('❌  DB init failed:', err.message);
  process.exit(1);
});
