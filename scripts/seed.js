// ── Seed Script — Realistic dummy data for all 16 tables ────
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

const SALT_ROUNDS = 12;
const caPath = path.join(process.cwd(), 'ca.pem');

// ── Helper: generate UUID-style transaction IDs ─────────────
function generateTxnId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'TXN-';
  for (let i = 0; i < 16; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'defaultdb',
    multipleStatements: true,
    ssl: {
      ca: fs.readFileSync(caPath),
    },
  });

  console.log('⏳  Seeding realistic dummy data for all 16 tables …\n');

  // ── Hash a shared test password ─────────────────────────────
  const passwordHash = await bcrypt.hash('Test@1234', SALT_ROUNDS);

  // ════════════════════════════════════════════════════════════
  //  USERS (5 realistic UIU students/alumni)
  // ════════════════════════════════════════════════════════════

  // User 1 — Client (Student, CSE)
  const [u1] = await conn.query(
    `INSERT INTO Users (RoleID, DeptID, Name, UiuEmail, PersonalEmail, PasswordHash, DOB, Bio, PVP_Points)
     VALUES (1, 1, 'Rafiq Ahmed', 'rafiq.ahmed@bss.uiu.ac.bd', 'rafiq.personal@gmail.com', ?, '2002-05-14',
     'CSE student looking for graphic design and web dev services for startup projects.', 0)`,
    [passwordHash]
  );
  const clientId = u1.insertId;
  await conn.query('INSERT INTO User_Private_Info (UserID, WhatsAppNumber) VALUES (?, ?)',
    [clientId, '+8801611223344']);

  // User 2 — Contributor 1 (Student, CSE) — high PVP
  const [u2] = await conn.query(
    `INSERT INTO Users (RoleID, DeptID, Name, UiuEmail, PersonalEmail, PasswordHash, DOB, Bio, PVP_Points, AverageRating)
     VALUES (1, 1, 'Nadia Sultana', 'nadia.sultana@bss.uiu.ac.bd', 'nadia.dev@gmail.com', ?, '2001-11-20',
     'Full-stack developer & logo designer. 3 years of freelance experience on Fiverr and locally.', 40, 4.80)`,
    [passwordHash]
  );
  const contributor1 = u2.insertId;
  await conn.query('INSERT INTO User_Private_Info (UserID, WhatsAppNumber, BkashNumber) VALUES (?, ?, ?)',
    [contributor1, '+8801712345678', '01712345678']);

  // User 3 — Contributor 2 (Alumni, BBA) — medium PVP
  const [u3] = await conn.query(
    `INSERT INTO Users (RoleID, DeptID, Name, UiuEmail, PersonalEmail, PasswordHash, DOB, Bio, PVP_Points, AverageRating)
     VALUES (2, 3, 'Tanvir Hasan', 'tanvir.hasan@e.uiu.ac.bd', 'tanvir.writes@gmail.com', ?, '1999-03-08',
     'BBA alumnus specializing in content writing, SEO copywriting, and social media strategy.', 22, 4.50)`,
    [passwordHash]
  );
  const contributor2 = u3.insertId;
  await conn.query('INSERT INTO User_Private_Info (UserID, BkashNumber) VALUES (?, ?)',
    [contributor2, '01898765432']);

  // User 4 — Contributor 3 (Student, EEE) — rising star
  const [u4] = await conn.query(
    `INSERT INTO Users (RoleID, DeptID, Name, UiuEmail, PersonalEmail, PasswordHash, DOB, Bio, PVP_Points, AverageRating)
     VALUES (1, 2, 'Anika Rahman', 'anika.rahman@bss.uiu.ac.bd', 'anika.design@gmail.com', ?, '2003-07-25',
     'EEE student passionate about UI/UX design and mobile app prototyping. Figma certified.', 15, 4.20)`,
    [passwordHash]
  );
  const contributor3 = u4.insertId;
  await conn.query('INSERT INTO User_Private_Info (UserID, WhatsAppNumber, BkashNumber) VALUES (?, ?, ?)',
    [contributor3, '+8801855667788', '01855667788']);

  // User 5 — Client 2 (Faculty, ECO) — occasionally hires students
  const [u5] = await conn.query(
    `INSERT INTO Users (RoleID, DeptID, Name, UiuEmail, PersonalEmail, PasswordHash, DOB, Bio, PVP_Points)
     VALUES (3, 4, 'Dr. Kamal Uddin', 'kamal.uddin@uiu.ac.bd', 'kamal.professor@gmail.com', ?, '1985-01-12',
     'Economics faculty member. Occasionally hires students for research data analysis and presentation design.', 5)`,
    [passwordHash]
  );
  const client2 = u5.insertId;
  await conn.query('INSERT INTO User_Private_Info (UserID) VALUES (?)', [client2]);

  // ── Assign Skills (junction table) ──────────────────────────
  await conn.query(`INSERT INTO User_Skills (UserID, SkillID) VALUES
    (?, 1), (?, 3),
    (?, 6), (?, 8),
    (?, 2), (?, 4),
    (?, 10)`,
    [contributor1, contributor1, contributor2, contributor2, contributor3, contributor3, client2]
  );

  // ════════════════════════════════════════════════════════════
  //  GIGS (6 diverse gigs)
  // ════════════════════════════════════════════════════════════

  const [g1] = await conn.query(
    `INSERT INTO Gigs (ContributorID, Title, Description, BasePrice)
     VALUES (?, 'Professional Logo Design', 'I will create a modern, minimal logo for your brand or startup project. Includes 3 concepts and unlimited revisions.', 500.00)`,
    [contributor1]
  );

  const [g2] = await conn.query(
    `INSERT INTO Gigs (ContributorID, Title, Description, BasePrice)
     VALUES (?, 'Responsive Portfolio Website', 'Full-stack responsive portfolio built with React & Node.js. Mobile-first design with SEO optimization included.', 3000.00)`,
    [contributor1]
  );

  const [g3] = await conn.query(
    `INSERT INTO Gigs (ContributorID, Title, Description, BasePrice)
     VALUES (?, 'SEO Blog Writing (1000 words)', 'SEO-optimized blog posts for your business or personal brand. Niche research, keyword integration, and Grammarly-proofed.', 800.00)`,
    [contributor2]
  );

  const [g4] = await conn.query(
    `INSERT INTO Gigs (ContributorID, Title, Description, BasePrice)
     VALUES (?, 'Social Media Strategy Package', 'Complete social media audit plus a 30-day content calendar with post templates for Instagram, Facebook, and LinkedIn.', 1500.00)`,
    [contributor2]
  );

  const [g5] = await conn.query(
    `INSERT INTO Gigs (ContributorID, Title, Description, BasePrice)
     VALUES (?, 'Mobile App UI/UX Design', 'Complete mobile app UI/UX design in Figma with interactive prototype, design system, and developer handoff kit.', 4000.00)`,
    [contributor3]
  );

  const [g6] = await conn.query(
    `INSERT INTO Gigs (ContributorID, Title, Description, BasePrice)
     VALUES (?, 'Presentation Design (Academic)', 'Professional PowerPoint/Google Slides for thesis defense, seminars, or conferences. Data visualization included.', 600.00)`,
    [contributor3]
  );

  // ════════════════════════════════════════════════════════════
  //  GIG_IMAGES (Multi-image gallery)
  // ════════════════════════════════════════════════════════════

  await conn.query(`INSERT INTO Gig_Images (GigID, ImageUrl, IsPrimary) VALUES
    (?, 'https://storage.gigverse.app/gigs/logo-design-cover.jpg', TRUE),
    (?, 'https://storage.gigverse.app/gigs/logo-design-sample1.jpg', FALSE),
    (?, 'https://storage.gigverse.app/gigs/logo-design-sample2.jpg', FALSE),
    (?, 'https://storage.gigverse.app/gigs/portfolio-site-cover.jpg', TRUE),
    (?, 'https://storage.gigverse.app/gigs/portfolio-site-mobile.jpg', FALSE),
    (?, 'https://storage.gigverse.app/gigs/seo-blog-cover.jpg', TRUE),
    (?, 'https://storage.gigverse.app/gigs/social-media-cover.jpg', TRUE),
    (?, 'https://storage.gigverse.app/gigs/mobile-app-cover.jpg', TRUE),
    (?, 'https://storage.gigverse.app/gigs/mobile-app-screens.jpg', FALSE),
    (?, 'https://storage.gigverse.app/gigs/presentation-cover.jpg', TRUE)`,
    [
      g1.insertId, g1.insertId, g1.insertId,
      g2.insertId, g2.insertId,
      g3.insertId,
      g4.insertId,
      g5.insertId, g5.insertId,
      g6.insertId
    ]
  );

  // ════════════════════════════════════════════════════════════
  //  ORDERS (4 orders with varied statuses)
  // ════════════════════════════════════════════════════════════

  const [o1] = await conn.query(
    `INSERT INTO Orders (ClientID, ContributorID, GigID, Amount, OrderStatus, PaymentStatus)
     VALUES (?, ?, ?, 500.00, 'Completed', 'Released')`,
    [clientId, contributor1, g1.insertId]
  );

  const [o2] = await conn.query(
    `INSERT INTO Orders (ClientID, ContributorID, GigID, Amount, OrderStatus, PaymentStatus)
     VALUES (?, ?, ?, 3000.00, 'In_Progress', 'Escrow_Held')`,
    [clientId, contributor1, g2.insertId]
  );

  const [o3] = await conn.query(
    `INSERT INTO Orders (ClientID, ContributorID, GigID, Amount, OrderStatus, PaymentStatus)
     VALUES (?, ?, ?, 800.00, 'Completed', 'Released')`,
    [client2, contributor2, g3.insertId]
  );

  const [o4] = await conn.query(
    `INSERT INTO Orders (ClientID, ContributorID, GigID, Amount, OrderStatus, PaymentStatus)
     VALUES (?, ?, ?, 4000.00, 'Disputed', 'Escrow_Held')`,
    [clientId, contributor3, g5.insertId]
  );

  // ════════════════════════════════════════════════════════════
  //  PAYMENTS (Transaction records for completed orders)
  // ════════════════════════════════════════════════════════════

  await conn.query(`INSERT INTO Payments (OrderID, TransactionID, Amount, PaymentMethod, Status) VALUES
    (?, ?, 500.00,  'Bkash',        'Completed'),
    (?, ?, 3000.00, 'Bkash',        'Completed'),
    (?, ?, 800.00,  'Bank_Transfer', 'Completed'),
    (?, ?, 4000.00, 'Bkash',        'Pending')`,
    [
      o1.insertId, generateTxnId(),
      o2.insertId, generateTxnId(),
      o3.insertId, generateTxnId(),
      o4.insertId, generateTxnId()
    ]
  );

  // ════════════════════════════════════════════════════════════
  //  REVIEWS (For completed orders)
  // ════════════════════════════════════════════════════════════

  await conn.query(
    `INSERT INTO Reviews (OrderID, ReviewerID, Rating, Comment)
     VALUES (?, ?, 5, 'Absolutely brilliant logo! Nadia delivered 3 concepts within 24 hours and the final design exceeded my expectations. Highly recommended for any branding work.')`,
    [o1.insertId, clientId]
  );

  await conn.query(
    `INSERT INTO Reviews (OrderID, ReviewerID, Rating, Comment)
     VALUES (?, ?, 4, 'Well-researched article with solid SEO keyword integration. Minor formatting issues were fixed promptly after feedback. Great communication throughout.')`,
    [o3.insertId, client2]
  );

  // ════════════════════════════════════════════════════════════
  //  MESSAGES (Realistic chat threads)
  // ════════════════════════════════════════════════════════════

  await conn.query(`INSERT INTO Messages (SenderID, ReceiverID, Content, IsRead, Timestamp) VALUES
    (?, ?, 'Hi Nadia! I saw your logo design gig. Can you do a minimalist logo for a tech startup?', TRUE,  '2026-04-25 10:30:00'),
    (?, ?, 'Hi Rafiq! Absolutely, I specialize in minimalist tech branding. Could you share your brand name and any color preferences?', TRUE,  '2026-04-25 10:35:00'),
    (?, ?, 'The startup is called "ByteFlow". I like dark blue and silver tones.', TRUE,  '2026-04-25 10:42:00'),
    (?, ?, 'Perfect! I will start working on 3 initial concepts. Expect the first drafts within 48 hours.', TRUE,  '2026-04-25 10:45:00'),
    (?, ?, 'Sounds great, placing the order now!', TRUE,  '2026-04-25 10:50:00'),
    (?, ?, 'Hi Tanvir, I need a blog post about renewable energy economics for my research blog.', TRUE,  '2026-04-28 14:00:00'),
    (?, ?, 'Dr. Kamal, I would be happy to help. What is the target word count and deadline?', TRUE,  '2026-04-28 14:15:00'),
    (?, ?, '1000 words, due by next Friday. I will provide the key references.', TRUE,  '2026-04-28 14:20:00'),
    (?, ?, 'Hey Anika, I placed an order for the mobile app design but the initial wireframes don''t match what we discussed.', FALSE, '2026-04-30 09:00:00'),
    (?, ?, 'Hi Rafiq, I apologize for the confusion. Can we hop on a quick call to realign on the requirements?', FALSE, '2026-04-30 09:15:00')`,
    [
      clientId, contributor1,
      contributor1, clientId,
      clientId, contributor1,
      contributor1, clientId,
      clientId, contributor1,
      client2, contributor2,
      contributor2, client2,
      client2, contributor2,
      clientId, contributor3,
      contributor3, clientId
    ]
  );

  // ════════════════════════════════════════════════════════════
  //  NOTIFICATIONS (System alerts)
  // ════════════════════════════════════════════════════════════

  await conn.query(`INSERT INTO Notifications (UserID, Title, Content, IsRead) VALUES
    (?, 'Order Completed',          'Your order #${o1.insertId} for "Professional Logo Design" has been marked as completed. Please leave a review!', TRUE),
    (?, 'Payment Received',         'Payment of ৳500.00 for order #${o1.insertId} has been released to your account.', TRUE),
    (?, 'New Order Received',       'You have a new order #${o2.insertId} for "Responsive Portfolio Website" from Rafiq Ahmed. Amount: ৳3,000.00', TRUE),
    (?, 'Order In Progress',        'Nadia Sultana has started working on your order #${o2.insertId}.', TRUE),
    (?, 'New Review',               'Rafiq Ahmed left a 5-star review on your completed order. Your PVP points have been updated!', TRUE),
    (?, 'Dispute Opened',           'A dispute has been raised on order #${o4.insertId} for "Mobile App UI/UX Design". Please check the dispute details.', FALSE),
    (?, 'Payment Released',         'Payment of ৳800.00 for order #${o3.insertId} has been released to your account.', TRUE),
    (?, 'Welcome to GigVerse!',     'Welcome aboard, Dr. Kamal! Explore talented student contributors and post your project requirements.', TRUE)`,
    [
      clientId,
      contributor1,
      contributor1,
      clientId,
      contributor1,
      contributor3,
      contributor2,
      client2
    ]
  );

  // ════════════════════════════════════════════════════════════
  //  DISPUTES (Conflict resolution)
  // ════════════════════════════════════════════════════════════

  await conn.query(
    `INSERT INTO Disputes (OrderID, RaisedByUserID, Reason, Status, ResolutionDetails)
     VALUES (?, ?, 'Initial wireframes do not match the agreed-upon requirements discussed in the chat. The color scheme and layout structure differ significantly from the reference images I provided.', 'Open', NULL)`,
    [o4.insertId, clientId]
  );

  // ════════════════════════════════════════════════════════════
  //  BOOKMARKS (Users saving favourite gigs)
  // ════════════════════════════════════════════════════════════

  await conn.query(`INSERT INTO Bookmarks (UserID, GigID) VALUES
    (?, ?),
    (?, ?),
    (?, ?),
    (?, ?)`,
    [
      clientId, g2.insertId,
      clientId, g5.insertId,
      client2, g4.insertId,
      client2, g6.insertId
    ]
  );

  // ════════════════════════════════════════════════════════════
  //  Summary Output
  // ════════════════════════════════════════════════════════════

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║            GigVerse — Seed Data Summary                 ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Users (5):                                             ║`);
  console.log(`║    Client:   Rafiq Ahmed      (ID ${clientId})                   ║`);
  console.log(`║    Contrib:  Nadia Sultana    (ID ${contributor1}, PVP 40)          ║`);
  console.log(`║    Contrib:  Tanvir Hasan     (ID ${contributor2}, PVP 22)          ║`);
  console.log(`║    Contrib:  Anika Rahman     (ID ${contributor3}, PVP 15)          ║`);
  console.log(`║    Client:   Dr. Kamal Uddin  (ID ${client2})                   ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Gigs:          6  (IDs ${g1.insertId}-${g6.insertId})                           ║`);
  console.log(`║  Gig Images:   10                                       ║`);
  console.log(`║  Orders:        4  (IDs ${o1.insertId}-${o4.insertId})                           ║`);
  console.log(`║  Payments:      4                                       ║`);
  console.log(`║  Reviews:       2                                       ║`);
  console.log(`║  Messages:     10                                       ║`);
  console.log(`║  Notifications: 8                                       ║`);
  console.log(`║  Disputes:      1                                       ║`);
  console.log(`║  Bookmarks:     4                                       ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  Password: Test@1234  (all users)                       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  await conn.end();
  process.exit(0);
})().catch((err) => {
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
});
