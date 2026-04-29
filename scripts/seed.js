// ── Seed Script — Insert dummy data for API testing ─────────
const fs   = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const mysql  = require('mysql2/promise');
require('dotenv').config();

const SALT_ROUNDS = 12;
const caPath = path.join(process.cwd(), 'ca.pem');

(async () => {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'defaultdb',
    multipleStatements: true,
    ssl: {
      ca: fs.readFileSync(caPath),
    },
  });

  console.log('⏳  Seeding dummy data …');

  // ── Hash a shared test password ─────────────────────────────
  const passwordHash = await bcrypt.hash('Test@1234', SALT_ROUNDS);

  // ── 3 Dummy Users ───────────────────────────────────────────
  // User 1: Client (Student, CSE)
  const [u1] = await conn.query(
    `INSERT INTO Users (RoleID, DeptID, Name, UiuEmail, PersonalEmail, PasswordHash, DOB, Bio, PVP_Points)
     VALUES (1, 1, 'Rafiq Ahmed', 'rafiq.ahmed@bss.uiu.ac.bd', 'rafiq.personal@gmail.com', ?, '2002-05-14', 'CSE student looking for graphic design services.', 0)`,
    [passwordHash]
  );
  const clientId = u1.insertId;
  await conn.query('INSERT INTO User_Private_Info (UserID) VALUES (?)', [clientId]);

  // User 2: Contributor 1 (Student, CSE) — high PVP
  const [u2] = await conn.query(
    `INSERT INTO Users (RoleID, DeptID, Name, UiuEmail, PersonalEmail, PasswordHash, DOB, Bio, PVP_Points)
     VALUES (1, 1, 'Nadia Sultana', 'nadia.sultana@bss.uiu.ac.bd', 'nadia.dev@gmail.com', ?, '2001-11-20', 'Full-stack developer & logo designer. 3 years of freelance experience.', 40)`,
    [passwordHash]
  );
  const contributor1 = u2.insertId;
  await conn.query('INSERT INTO User_Private_Info (UserID, WhatsAppNumber, BkashNumber) VALUES (?, ?, ?)',
    [contributor1, '+8801712345678', '01712345678']);

  // User 3: Contributor 2 (Alumni, BBA) — lower PVP
  const [u3] = await conn.query(
    `INSERT INTO Users (RoleID, DeptID, Name, UiuEmail, PersonalEmail, PasswordHash, DOB, Bio, PVP_Points)
     VALUES (2, 3, 'Tanvir Hasan', 'tanvir.hasan@e.uiu.ac.bd', 'tanvir.writes@gmail.com', ?, '1999-03-08', 'BBA alumnus specializing in content writing and social media.', 10)`,
    [passwordHash]
  );
  const contributor2 = u3.insertId;
  await conn.query('INSERT INTO User_Private_Info (UserID, BkashNumber) VALUES (?, ?)',
    [contributor2, '01898765432']);

  // ── Assign Skills (junction table) ──────────────────────────
  // Nadia: Logo Design (1) + Web Development (3)
  await conn.query('INSERT INTO User_Skills (UserID, SkillID) VALUES (?, ?), (?, ?)',
    [contributor1, 1, contributor1, 3]);

  // Tanvir: Content Writing (6) + Social Media Marketing (8)
  await conn.query('INSERT INTO User_Skills (UserID, SkillID) VALUES (?, ?), (?, ?)',
    [contributor2, 6, contributor2, 8]);

  // ── Sample Gigs ─────────────────────────────────────────────
  const [g1] = await conn.query(
    `INSERT INTO Gigs (ContributorID, Title, Description, BasePrice)
     VALUES (?, 'Professional Logo Design', 'I will create a modern, minimal logo for your brand or project.', 500.00)`,
    [contributor1]
  );

  const [g2] = await conn.query(
    `INSERT INTO Gigs (ContributorID, Title, Description, BasePrice)
     VALUES (?, 'Responsive Portfolio Website', 'Full-stack responsive portfolio built with React & Node.js.', 3000.00)`,
    [contributor1]
  );

  const [g3] = await conn.query(
    `INSERT INTO Gigs (ContributorID, Title, Description, BasePrice)
     VALUES (?, 'SEO Blog Writing (1000 words)', 'SEO-optimized blog posts for your business or personal brand.', 800.00)`,
    [contributor2]
  );

  // ── Sample Order (Escrow) ───────────────────────────────────
  const [o1] = await conn.query(
    `INSERT INTO Orders (ClientID, ContributorID, GigID, Amount, OrderStatus, PaymentStatus)
     VALUES (?, ?, ?, 500.00, 'Completed', 'Escrow_Held')`,
    [clientId, contributor1, g1.insertId]
  );

  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║          Seed Data Inserted                  ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  Client :  Rafiq Ahmed   (UserID ${clientId})         ║`);
  console.log(`║  Contrib:  Nadia Sultana (UserID ${contributor1}, PVP 40)  ║`);
  console.log(`║  Contrib:  Tanvir Hasan  (UserID ${contributor2}, PVP 10)  ║`);
  console.log(`║  Gigs   :  ${g1.insertId}, ${g2.insertId}, ${g3.insertId}                             ║`);
  console.log(`║  Order  :  ${o1.insertId} (Escrow_Held)                  ║`);
  console.log('║  Password: Test@1234  (all users)            ║');
  console.log('╚══════════════════════════════════════════════╝');

  await conn.end();
  process.exit(0);
})().catch((err) => {
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
});
