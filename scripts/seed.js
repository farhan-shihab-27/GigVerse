const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

const DEPARTMENTS = [
  { id: 1, code: '011', name: 'B.Sc. in CSE' },
  { id: 2, code: '021', name: 'B.Sc. in EEE' },
  { id: 3, code: '031', name: 'B.Sc. in CE' },
  { id: 4, code: '015', name: 'B.Sc. in Data Science' },
  { id: 5, code: '111', name: 'BBA' },
  { id: 6, code: '114', name: 'BBA in AIS' },
  { id: 7, code: '121', name: 'B.Sc. in Economics' },
  { id: 8, code: '211', name: 'BSS in EDS' },
  { id: 9, code: '221', name: 'BSS in MSJ' },
  { id: 10, code: '231', name: 'BA in English' },
  { id: 11, code: '311', name: 'B. Pharmacy' },
  { id: 12, code: '321', name: 'B.Sc. in BSBGE' },
  { id: 13, code: '012', name: 'M.Sc. in CSE' },
  { id: 14, code: '112', name: 'MBA' },
  { id: 15, code: '113', name: 'Executive MBA' },
  { id: 16, code: '115', name: 'Master in IHRM' },
  { id: 17, code: '124', name: 'MS in Economics' },
  { id: 18, code: '125', name: 'Master in Dev. Studies' },
];

const FIRST_NAMES = ['Aariz', 'Samia', 'Farhan', 'Nafis', 'Sadia', 'Tahmid', 'Raisa', 'Adnan', 'Zareen', 'Imran', 'Ayesha', 'Rakib', 'Maha', 'Sakib', 'Nusrat', 'Hasib', 'Fariha', 'Tanvir', 'Iffat', 'Mahmud', 'Sumaiya', 'Anika', 'Faisal', 'Rifat', 'Nadia'];
const LAST_NAMES = ['Islam', 'Rahman', 'Ahmed', 'Khan', 'Hossain', 'Chowdhury', 'Uddin', 'Alam', 'Hassan', 'Ali', 'Begum', 'Siddique', 'Das', 'Roy', 'Sen', 'Kabir', 'Haque', 'Mahmud', 'Sikder'];

const GIG_TITLES = ['Professional Logo Design', 'React Frontend Development', 'Node.js Backend Setup', 'Machine Learning Model', 'Data Analysis with Python', 'Technical Article Writing', 'SEO Optimization', 'Video Editing for YouTube', 'Math Tutoring (Calculus)', 'Digital Marketing Strategy', 'UI/UX Mobile App Design', 'Database Architecture', 'Excel Data Entry', 'Business Plan Writing', 'Music Production / Mixing'];

const PREMIUM_IMAGES = [
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80'
];

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

(async () => {
  try {
    const connection = await mysql.createConnection({
      host:     process.env.DB_HOST     || 'localhost',
      port:     Number(process.env.DB_PORT) || 3306,
      user:     process.env.DB_USER     || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME     || 'gigverse',
      multipleStatements: true,
    });

    console.log('⏳ Starting massive DB Seed... wiping old data.');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE Reviews');
    await connection.query('TRUNCATE TABLE Orders');
    await connection.query('TRUNCATE TABLE Gig_Images');
    await connection.query('TRUNCATE TABLE Experiences');
    await connection.query('TRUNCATE TABLE Gigs');
    await connection.query('TRUNCATE TABLE User_Private_Info');
    await connection.query('TRUNCATE TABLE Users');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('⏳ Generating 120 Users...');
    const users = [];
    const passwordHash = await bcrypt.hash('gigverse123', 10);
    
    for (let i = 0; i < 120; i++) {
      const firstName = FIRST_NAMES[getRandomInt(0, FIRST_NAMES.length - 1)];
      const lastName = LAST_NAMES[getRandomInt(0, LAST_NAMES.length - 1)];
      const name = `${firstName} ${lastName}`;
      const roleId = getRandomInt(1, 10) > 8 ? 2 : 1; // 80% students, 20% alumni
      const dept = DEPARTMENTS[getRandomInt(0, DEPARTMENTS.length - 1)];
      
      const year = getRandomInt(19, 24).toString();
      const trimester = getRandomInt(1, 3).toString();
      const serial = getRandomInt(1, 9999).toString().padStart(4, '0');
      const uiuId = `${dept.code}${year}${trimester}${serial}`;
      
      const uiuEmail = `${firstName.toLowerCase()}${uiuId.substring(4)}_${i}@bss.uiu.ac.bd`;
      const personalEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@gmail.com`;
      const pvpPoints = getRandomInt(500, 1500);
      const avgRating = (getRandomInt(40, 50) / 10).toFixed(1);
      const profilePicUrl = `https://i.pravatar.cc/150?img=${getRandomInt(1, 70)}`;
      const bio = `Expert in my field with 4 years of experience. Passionate about delivering high quality work for the UIU community!`;

      const [res] = await connection.query(
        `INSERT INTO Users (RoleID, DeptID, Name, UiuId, UiuEmail, PersonalEmail, PasswordHash, PVP_Points, ProfilePicUrl, Bio, AverageRating) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [roleId, dept.id, name, uiuId, uiuEmail, personalEmail, passwordHash, pvpPoints, profilePicUrl, bio, avgRating]
      );
      
      const userId = res.insertId;
      users.push({ id: userId, deptId: dept.id, name });

      await connection.query(
        'INSERT INTO User_Private_Info (UserID, WhatsAppNumber) VALUES (?, ?)',
        [userId, `+88017${getRandomInt(10000000, 99999999)}`]
      );

      // Experiences
      await connection.query(
        'INSERT INTO Experiences (UserID, Title, Company, StartDate, Description) VALUES (?, ?, ?, ?, ?)',
        [userId, 'UI/UX Designer', 'Self-Employed', '2024-01-01', 'Delivered high quality results.']
      );
      await connection.query(
        'INSERT INTO Experiences (UserID, Title, Company, StartDate, Description) VALUES (?, ?, ?, ?, ?)',
        [userId, 'Content Writer', 'TechCorp', '2020-01-01', 'Delivered high quality results.']
      );

      // Skills
      const numSkills = getRandomInt(1, 3);
      for (let k = 0; k < numSkills; k++) {
        const skillId = getRandomInt(1, 10);
        await connection.query('INSERT IGNORE INTO User_Skills (UserID, SkillID) VALUES (?, ?)', [userId, skillId]);
      }
    }
    console.log('✅ Generated 120 Rich Users.');

    console.log('⏳ Generating Gigs & Orders/Reviews for EVERY User...');
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const title = GIG_TITLES[getRandomInt(0, GIG_TITLES.length - 1)];
      const desc = `I will deliver excellent quality work for your project involving ${title}. Experienced and ready to collaborate with UIU students.`;
      const price = getRandomInt(15, 99) * 100;

      const [gigRes] = await connection.query(
        `INSERT INTO Gigs (ContributorID, Title, Description, BasePrice) 
         VALUES (?, ?, ?, ?)`,
        [user.id, title, desc, price]
      );
      const gigId = gigRes.insertId;

      await connection.query(
        'INSERT INTO Gig_Images (GigID, ImageUrl, IsPrimary) VALUES (?, ?, 1)',
        [gigId, PREMIUM_IMAGES[getRandomInt(0, PREMIUM_IMAGES.length - 1)]]
      );

      // Generate a completed order and a review for this gig
      let client = users[getRandomInt(0, users.length - 1)];
      while (client.id === user.id) {
        client = users[getRandomInt(0, users.length - 1)];
      }

      const [orderRes] = await connection.query(
        'INSERT INTO Orders (ClientID, ContributorID, GigID, Amount, OrderStatus) VALUES (?, ?, ?, ?, ?)',
        [client.id, user.id, gigId, price, 'Completed']
      );
      const orderId = orderRes.insertId;

      await connection.query(
        'INSERT INTO Reviews (OrderID, ReviewerID, Rating, Comment) VALUES (?, ?, ?, ?)',
        [orderId, client.id, 5, 'Outstanding work, highly recommended!']
      );
      
      // Optionally give top PVP users a second gig
      if (i % 3 === 0) {
        const title2 = GIG_TITLES[getRandomInt(0, GIG_TITLES.length - 1)] + ' Pro';
        const [gigRes2] = await connection.query(
          `INSERT INTO Gigs (ContributorID, Title, Description, BasePrice) VALUES (?, ?, ?, ?)`,
          [user.id, title2, desc, price + 500]
        );
        const gigId2 = gigRes2.insertId;
        await connection.query(
          'INSERT INTO Gig_Images (GigID, ImageUrl, IsPrimary) VALUES (?, ?, 1)',
          [gigId2, PREMIUM_IMAGES[getRandomInt(0, PREMIUM_IMAGES.length - 1)]]
        );
      }
    }
    console.log('✅ Generated Rich Gigs & Reviews for all users.');

    await connection.end();
    console.log('🚀 Seeding complete! The platform is populated.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
})();
