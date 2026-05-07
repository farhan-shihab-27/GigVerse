// scripts/seed.js — GigVerse Massive Dummy Data Seeder (100+ Records)
// Usage: node scripts/seed.js
// Requires: mysql2, bcrypt, dotenv

const fs     = require('fs');
const path   = require('path');
const mysql  = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'password123';

// ── Helper: random int between min..max inclusive ──────────
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick    = (arr) => arr[randInt(0, arr.length - 1)];
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

// ── Realistic name pools ────────────────────────────────────
const FIRST_NAMES = ['Farhan','Nadia','Arif','Tasfia','Rahat','Sadia','Tanvir','Maha','Sajid','Fariha','Imran','Lamia','Kabir','Rumi','Zayan','Nusrat','Rifat','Tanjina','Mahir','Ayesha','Fahim','Sumaiya','Hasan','Naima','Rakib','Tasneem','Shihab','Fatema','Omar','Maliha','Jubair','Raisa','Wasif','Ehsan','Afrin','Mushfiq','Nafisa','Sakib','Jannat','Adnan','Mehzabin','Tamim','Sabrina','Sohan','Priya','Masud','Nira','Touhid'];
const LAST_NAMES  = ['Rahman','Ahmed','Hasan','Islam','Khan','Chowdhury','Akter','Ali','Begum','Uddin','Hoque','Siddique','Barua','Das','Molla','Bhuiyan','Talukder','Noor','Jahan','Sultana','Parveen','Alam','Reza','Miah','Nahar','Saha'];

// ── Gig title pools per category ────────────────────────────
const GIG_TITLES = {
  Design: ['Professional Logo Design for Startups','Modern UI/UX Design for Mobile Apps','Brand Identity Package with Guidelines','Social Media Banner Design Pack','Infographic Design for Presentations','Business Card & Stationery Design','Landing Page UI Design in Figma','Icon Set Design (50 custom icons)','Magazine Layout & Editorial Design','Product Packaging Design'],
  Development: ['Full-Stack React + Node.js Web App','WordPress Website Development','REST API Development with Express.js','Python Automation Script','Flutter Mobile App Development','E-Commerce Store Setup (Shopify)','Custom Chrome Extension','Database Design & Optimization','Discord Bot Development','Portfolio Website with Animations'],
  Writing: ['SEO Blog Article (2000+ words)','Academic Research Paper Assistance','Resume & Cover Letter Writing','Product Description Copywriting','Social Media Content Calendar','Technical Documentation Writing','Creative Story Writing','Press Release Drafting','Email Newsletter Campaign Copy','Thesis Proofreading & Editing'],
  Marketing: ['Social Media Marketing Strategy','Facebook & Instagram Ad Campaign','SEO Audit & Optimization Report','Email Marketing Funnel Setup','Content Marketing Plan (3 months)','Google Ads PPC Campaign Management','Influencer Outreach Campaign','Brand Awareness Strategy','YouTube Channel Growth Plan','TikTok Marketing Strategy'],
  Tutoring: ['Calculus I & II Private Tutoring','Python Programming Crash Course','IELTS Preparation (Speaking + Writing)','Physics Problem Solving Sessions','Data Structures & Algorithms Tutoring','English Academic Writing Workshop','Statistics & Probability Tutoring','Web Development Bootcamp (1-on-1)','Chemistry Lab Report Guidance','Digital Logic Design Tutoring']
};

const GIG_DESCRIPTIONS = [
  'I will deliver high-quality, professional work tailored to your specific requirements. With years of experience in this field, I guarantee satisfaction. Revisions included.',
  'Get premium results with a fast turnaround. I specialize in delivering clean, modern, and industry-standard output. Unlimited revisions until you are happy.',
  'Looking for top-tier quality? I bring expertise and attention to detail to every project. Clear communication throughout the process. Money-back guarantee.',
  'Professional service with a personal touch. I understand the needs of students and businesses alike. Quick delivery, competitive pricing, and outstanding results.',
  'Let me bring your vision to life with expert-level skills. I have completed 50+ similar projects with 5-star reviews. Your satisfaction is my priority.',
];

const IMAGE_URLS = [
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600',
  'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600',
  'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=600',
  'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=600',
];

const VIP_USERS = [
  { name: 'Samira Sarkar', bio: 'Expert UI/UX Designer and Frontend Developer with 4 years of experience.', roleId: 1, pvp: 950, rating: '4.95', pic: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200' },
  { name: 'Tahmina Karim', bio: 'Senior Software Engineer specializing in scalable backend architectures.', roleId: 2, pvp: 890, rating: '4.85', pic: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' },
  { name: 'Kabir Mahmud', bio: 'Digital Marketing Strategist helping startups grow.', roleId: 1, pvp: 820, rating: '4.70', pic: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200' }
];

async function seed() {
  console.log('\n🌱 GigVerse Power Seeder — Starting...\n');

  const caPath = path.join(process.cwd(), 'ca.pem');
  const pool = mysql.createPool({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'defaultdb',
    ssl: { ca: fs.readFileSync(caPath), rejectUnauthorized: true },
    waitForConnections: true, connectionLimit: 5,
  });

  const conn = await pool.getConnection();
  console.log('✅ Connected to Aiven MySQL\n');

  try {
    console.log('🗑️  Clearing existing data...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    const tables = ['Bookmarks','Experiences','Disputes','Notifications','Messages','Reviews','Payments','Orders','Gig_Images','Gigs','User_Skills','User_Private_Info','Users','Skills','Categories','Departments','Roles'];
    for (const t of tables) await conn.query(`TRUNCATE TABLE ${t}`);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('   ✓ All tables truncated\n');
  } catch(err) { console.error('Error clearing tables:', err.message); process.exit(1); }

  try {
    console.log('📋 Seeding Lookup Tables (Roles, Departments, Categories, Skills)...');
    await conn.query(`INSERT INTO Roles (RoleName) VALUES ('Student'),('Alumni'),('Faculty')`);
    await conn.query(`INSERT INTO Departments (DeptName, DeptCode) VALUES ('Computer Science and Engineering','CSE'), ('Electrical and Electronic Engineering','EEE'), ('Business Administration','BBA'), ('Economics','ECO'), ('Civil Engineering','CE')`);
    await conn.query(`INSERT INTO Categories (CategoryName) VALUES ('Design'),('Development'),('Writing'),('Marketing'),('Tutoring')`);
    await conn.query(`INSERT INTO Skills (CategoryID, SkillName) VALUES (1,'Logo Design'),(1,'UI/UX Design'),(1,'Illustration'),(1,'Video Editing'), (2,'Web Development'),(2,'Mobile App Development'),(2,'Python Scripting'),(2,'Database Management'), (3,'Content Writing'),(3,'Academic Writing'),(3,'Copywriting'),(3,'Technical Writing'), (4,'Social Media Marketing'),(4,'SEO Optimization'),(4,'Email Marketing'),(4,'PPC Advertising'), (5,'Math Tutoring'),(5,'Programming Tutoring'),(5,'Language Tutoring'),(5,'Science Tutoring')`);
    console.log('   ✓ Lookup tables seeded\n');
  } catch(err) { console.error('Error seeding lookups:', err.message); process.exit(1); }

  const hash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  // 1. Users
  try {
    console.log('👥 Seeding 100 Users...');
    const userValues = [];
    const usedUiuEmails = new Set();
    const usedPersonalEmails = new Set();

    for (let i = 0; i < 100; i++) {
      let first, last, name, roleId, pvp, rating, bio, pic;
      if (i < VIP_USERS.length) {
        const parts = VIP_USERS[i].name.split(' ');
        first = parts[0]; last = parts[1];
        name = VIP_USERS[i].name; roleId = VIP_USERS[i].roleId;
        pvp = VIP_USERS[i].pvp; rating = VIP_USERS[i].rating;
        bio = VIP_USERS[i].bio; pic = VIP_USERS[i].pic;
      } else {
        first = pick(FIRST_NAMES); last  = pick(LAST_NAMES);
        name  = `${first} ${last}`; roleId = i < 70 ? 1 : i < 90 ? 2 : 3;
        pvp = randInt(0, 500); rating = (Math.random() * 2 + 3).toFixed(2);
        bio = `${name} is a talented UIU ${roleId === 1 ? 'student' : roleId === 2 ? 'alumnus' : 'faculty member'} specializing in various skills.`;
        pic = `https://i.pravatar.cc/150?u=${i}`;
      }
      
      const deptId = (i % 5) + 1;
      const suffix = String(i).padStart(3, '0');

      let uiuEmail = `${first.toLowerCase()}${suffix}@bss.uiu.ac.bd`;
      while (usedUiuEmails.has(uiuEmail)) uiuEmail = `${first.toLowerCase()}${randInt(100,999)}@bss.uiu.ac.bd`;
      usedUiuEmails.add(uiuEmail);

      let personalEmail = `${first.toLowerCase()}.${last.toLowerCase()}${suffix}@gmail.com`;
      while (usedPersonalEmails.has(personalEmail)) personalEmail = `${first.toLowerCase()}${randInt(100,999)}@gmail.com`;
      usedPersonalEmails.add(personalEmail);

      const dob = `${randInt(1995, 2004)}-${String(randInt(1,12)).padStart(2,'0')}-${String(randInt(1,28)).padStart(2,'0')}`;
      userValues.push([roleId, deptId, name, uiuEmail, personalEmail, hash, dob, pic, bio, pvp, rating]);
    }
    const userPlaceholders = userValues.map(() => '(?,?,?,?,?,?,?,?,?,?,?)').join(',');
    await conn.query(`INSERT INTO Users (RoleID,DeptID,Name,UiuEmail,PersonalEmail,PasswordHash,DOB,ProfilePicUrl,Bio,PVP_Points,AverageRating) VALUES ${userPlaceholders}`, userValues.flat());
    console.log('   ✓ 100 users inserted\n');
  } catch(err) { console.error('Error seeding Users:', err.message); process.exit(1); }

  // 2. User_Private_Info
  try {
    console.log('🔒 Seeding 100 User_Private_Info (EVERY user gets data)...');
    const privateValues = [];
    for (let i = 1; i <= 100; i++) {
      const wa = `+8801${randInt(3,9)}${String(randInt(10000000,99999999))}`;
      const bk = `01${randInt(3,9)}${String(randInt(10000000,99999999))}`;
      const bank = `BRAC Bank, Acc: ${randInt(100000000,999999999)}, Gulshan Branch`;
      privateValues.push([i, wa, bk, bank]);
    }
    const privatePlaceholders = privateValues.map(() => '(?,?,?,?)').join(',');
    await conn.query(`INSERT INTO User_Private_Info (UserID,WhatsAppNumber,BkashNumber,BankAccountDetails) VALUES ${privatePlaceholders}`, privateValues.flat());
    console.log('   ✓ 100 private info records inserted\n');
  } catch(err) { console.error('Error seeding Private Info:', err.message); process.exit(1); }

  // 3. User_Skills (>= 3 per user)
  try {
    console.log('🎯 Seeding User_Skills (>= 3 skills per user)...');
    const skillPairs = [];
    for (let userId = 1; userId <= 100; userId++) {
      const numSkills = randInt(3, 6);
      const skills = shuffle([...Array(20)].map((_, i) => i + 1)).slice(0, numSkills);
      skills.forEach(skillId => skillPairs.push([userId, skillId]));
    }
    const skillPlaceholders = skillPairs.map(() => '(?,?)').join(',');
    await conn.query(`INSERT INTO User_Skills (UserID,SkillID) VALUES ${skillPlaceholders}`, skillPairs.flat());
    console.log(`   ✓ ${skillPairs.length} user-skill mappings inserted\n`);
  } catch(err) { console.error('Error seeding User_Skills:', err.message); process.exit(1); }

  // 4. Experiences (>= 2 per user)
  try {
    console.log('📈 Seeding Experiences (>= 2 per user)...');
    const expValues = [];
    const roles = ['Frontend Developer', 'UI/UX Designer', 'Content Writer', 'Marketing Specialist', 'Tutor'];
    const companies = ['TechCorp', 'Design Studio', 'Freelance', 'UIU IT Team', 'Self-Employed'];
    for (let userId = 1; userId <= 100; userId++) {
      const numExp = randInt(2, 4);
      for(let i=0; i<numExp; i++) {
        expValues.push([
          userId, pick(roles), pick(companies), `${randInt(2020, 2024)}-01-01`, null, 'Delivered high quality results.'
        ]);
      }
    }
    const expPlaceholders = expValues.map(() => '(?,?,?,?,?,?)').join(',');
    await conn.query(`INSERT INTO Experiences (UserID,Title,Company,StartDate,EndDate,Description) VALUES ${expPlaceholders}`, expValues.flat());
    console.log(`   ✓ ${expValues.length} Experiences inserted\n`);
  } catch(err) { console.error('Error seeding Experiences:', err.message); process.exit(1); }

  // 5. Gigs
  try {
    console.log('💼 Seeding 200 Gigs...');
    const categoryNames = ['Design','Development','Writing','Marketing','Tutoring'];
    const gigValues = [];
    for (let i = 0; i < 200; i++) {
      const contributorId = (i % 100) + 1; // 2 gigs per user
      const catName = categoryNames[i % 5];
      const titles  = GIG_TITLES[catName];
      const title   = titles[i % titles.length];
      const desc    = pick(GIG_DESCRIPTIONS);
      const price   = randInt(5, 200) * 50;
      gigValues.push([contributorId, title, desc, price]);
    }
    const gigPlaceholders = gigValues.map(() => '(?,?,?,?)').join(',');
    await conn.query(`INSERT INTO Gigs (ContributorID,Title,Description,BasePrice) VALUES ${gigPlaceholders}`, gigValues.flat());
    console.log('   ✓ 200 gigs inserted\n');
  } catch(err) { console.error('Error seeding Gigs:', err.message); process.exit(1); }

  // 6. Gig_Images
  try {
    console.log('🖼️  Seeding 200 Gig Images...');
    const imgValues = [];
    for (let gigId = 1; gigId <= 200; gigId++) {
      imgValues.push([gigId, pick(IMAGE_URLS), true]);
    }
    const imgPlaceholders = imgValues.map(() => '(?,?,?)').join(',');
    await conn.query(`INSERT INTO Gig_Images (GigID,ImageUrl,IsPrimary) VALUES ${imgPlaceholders}`, imgValues.flat());
    console.log('   ✓ 200 gig images inserted\n');
  } catch(err) { console.error('Error seeding Gig Images:', err.message); process.exit(1); }

  // 7. Orders (Need enough to generate reviews)
  let orderCount = 0;
  try {
    console.log('📦 Seeding 400 sample Orders...');
    const orderValues = [];
    for (let i = 0; i < 400; i++) {
      const gigId = randInt(1, 200);
      const clientId = randInt(1, 100);
      const contributorId = (gigId % 100) + 1; // approximate
      if (contributorId === clientId) continue; // skip self-orders
      const amount = randInt(5, 200) * 50;
      orderValues.push([clientId, contributorId, gigId, amount, 'Completed', 'Released']);
    }
    orderCount = orderValues.length;
    const orderPlaceholders = orderValues.map(() => '(?,?,?,?,?,?)').join(',');
    await conn.query(`INSERT INTO Orders (ClientID,ContributorID,GigID,Amount,OrderStatus,PaymentStatus) VALUES ${orderPlaceholders}`, orderValues.flat());
    console.log(`   ✓ ${orderCount} orders inserted\n`);
  } catch(err) { console.error('Error seeding Orders:', err.message); process.exit(1); }

  // 8. Reviews (>= 3 per user, meaning we review every completed order!)
  try {
    console.log('⭐ Seeding Reviews (>= 3 per user)...');
    const [orders] = await conn.query("SELECT OrderID, ClientID FROM Orders WHERE OrderStatus = 'Completed'");
    const reviewValues = [];
    for (const o of orders) {
      reviewValues.push([o.OrderID, o.ClientID, randInt(4, 5), 'Great experience, highly recommended!']);
    }
    if (reviewValues.length > 0) {
      const reviewPlaceholders = reviewValues.map(() => '(?,?,?,?)').join(',');
      await conn.query(`INSERT INTO Reviews (OrderID,ReviewerID,Rating,Comment) VALUES ${reviewPlaceholders}`, reviewValues.flat());
      console.log(`   ✓ ${reviewValues.length} Reviews inserted\n`);
    } else {
      console.log('   ! No completed orders to review\n');
    }
  } catch(err) { console.error('Error seeding Reviews:', err.message); process.exit(1); }

  console.log('═══════════════════════════════════════════');
  console.log('🎉 POWER SEEDING COMPLETE!');
  console.log('═══════════════════════════════════════════\n');

  conn.release();
  await pool.end();
  process.exit(0);
}

seed();
