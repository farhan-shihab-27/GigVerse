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

const FIRST_NAMES = [
  'Aariz', 'Samia', 'Farhan', 'Nafis', 'Sadia', 'Tahmid', 'Raisa', 'Adnan', 'Zareen', 'Imran',
  'Ayesha', 'Rakib', 'Maha', 'Sakib', 'Nusrat', 'Hasib', 'Fariha', 'Tanvir', 'Iffat', 'Mahmud',
  'Sumaiya', 'Anika', 'Faisal', 'Rifat', 'Nadia', 'Arman', 'Lamia', 'Sabbir', 'Tamanna', 'Zahid'
];
const LAST_NAMES = [
  'Islam', 'Rahman', 'Ahmed', 'Khan', 'Hossain', 'Chowdhury', 'Uddin', 'Alam', 'Hassan', 'Ali',
  'Begum', 'Siddique', 'Das', 'Roy', 'Sen', 'Kabir', 'Haque', 'Mahmud', 'Sikder', 'Sarkar',
  'Karim', 'Talukder', 'Molla', 'Nahar', 'Sultana'
];

// 7 Categories — gigs will be distributed EVENLY across all of them
const GIG_CATEGORIES = [
  {
    cat: 'Web Development',
    titles: [
      'React Frontend Development', 'Node.js Backend Setup', 'Full-Stack Web App',
      'E-commerce Store Creation', 'WordPress Site Customization', 'Next.js Dashboard Build',
      'REST API Development', 'Landing Page Development'
    ],
    skills: [3, 4], // Web Development, Mobile App Development
    bios: [
      'Experienced full-stack developer specializing in React, Node.js, and modern JavaScript frameworks. Delivered 20+ projects for startups and SMEs.',
      'Frontend engineer with deep expertise in responsive design, performance optimization, and interactive web applications.',
    ]
  },
  {
    cat: 'Graphic Design',
    titles: [
      'Professional Logo Design', 'UI/UX Mobile App Design', 'Brand Identity Kit',
      'Social Media Graphics', 'Brochure and Print Design', 'Presentation Deck Design',
      'Infographic Creation', 'Packaging Design'
    ],
    skills: [1, 2], // Logo Design, UI/UX Design
    bios: [
      'Creative visual designer with 3+ years crafting brand identities, UI mockups, and marketing collateral for diverse clients.',
      'Award-winning graphic designer passionate about minimalist aesthetics and user-centered design thinking.',
    ]
  },
  {
    cat: 'Content Writing',
    titles: [
      'Technical Article Writing', 'SEO Optimized Blog Posts', 'Copywriting for Landing Pages',
      'Academic Proofreading', 'Website Content Creation', 'Resume and Cover Letter Writing',
      'Press Release Drafting', 'Product Description Writing'
    ],
    skills: [6, 7], // Content Writing, Academic Writing
    bios: [
      'Published content strategist with expertise in SEO-driven blog posts, technical documentation, and academic editing.',
      'Professional copywriter delivering compelling narratives for brands, startups, and academic institutions.',
    ]
  },
  {
    cat: 'Digital Marketing',
    titles: [
      'SEO Optimization', 'Digital Marketing Strategy', 'Facebook Ads Campaign',
      'Social Media Management', 'Email Marketing Setup', 'Google Analytics Audit',
      'Influencer Outreach Plan', 'Content Marketing Strategy'
    ],
    skills: [8], // Social Media Marketing
    bios: [
      'Results-driven digital marketer with proven ROI in paid campaigns, organic growth, and brand positioning.',
      'Social media strategist specializing in data-driven engagement and community building for B2B and B2C brands.',
    ]
  },
  {
    cat: 'Academic Tutoring',
    titles: [
      'Calculus Tutoring', 'Physics Tutoring', 'Java Programming Basics',
      'English Language Practice', 'Data Structures Mentoring', 'Digital Logic Design Tutoring',
      'Statistics and Probability Tutoring', 'Discrete Mathematics Coaching'
    ],
    skills: [9, 10], // Math Tutoring, Programming Tutoring
    bios: [
      'Dedicated academic tutor helping UIU students excel in STEM subjects through personalized mentoring.',
      'Experienced programming mentor with a focus on algorithmic thinking and hands-on coding practice.',
    ]
  },
  {
    cat: 'Photography',
    titles: [
      'Event Photography', 'Professional Portrait Shoot', 'Product Photography',
      'Photo Editing and Retouching', 'Campus Event Coverage', 'Real Estate Photography',
      'Food Photography', 'Corporate Headshots'
    ],
    skills: [1, 2], // Using Design skills as proxy
    bios: [
      'Professional photographer capturing high-quality visuals for events, products, and corporate branding.',
      'Creative visual storyteller with expertise in portrait photography and advanced post-processing techniques.',
    ]
  },
  {
    cat: 'Data Analysis',
    titles: [
      'Data Analysis with Python', 'Excel Data Entry and Formatting', 'Machine Learning Model',
      'Business Intelligence Dashboard', 'Statistical Analysis in R', 'Data Visualization',
      'Database Design and Optimization', 'Power BI Report Building'
    ],
    skills: [3, 5], // Web Development, Python Scripting
    bios: [
      'Data scientist proficient in Python, R, SQL, and visualization tools. Transforming raw data into actionable business insights.',
      'Analytical problem-solver with hands-on experience in ML model development and statistical research.',
    ]
  }
];

// Premium Tech/Freelance Unsplash images — NO landscapes, NO nature
const PREMIUM_GIG_IMAGES = [
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1561112078-7d28e39f55e4?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
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
  'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?auto=format&fit=crop&w=800&q=80'
];

// Professional portrait avatars from Unsplash
const PREMIUM_AVATARS = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1531123897727-8f129e1bf98c?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80'
];

const REVIEW_COMMENTS = [
  'Outstanding work, highly recommended for the community!',
  'Exceeded expectations. Professional, timely, and creative.',
  'Great experience, would hire again without hesitation.',
  'Very knowledgeable and easy to communicate with.',
  'Delivered exactly what was promised. Top-notch quality.',
  'Impressive attention to detail and fast turnaround.',
  'Best freelancer on campus. Five stars!',
  'Excellent professionalism and deep subject expertise.'
];

const EXPERIENCE_TITLES_STUDENT = [
  'Freelance Web Developer', 'UI/UX Designer', 'Content Writer', 'Social Media Manager',
  'Campus Event Photographer', 'Research Assistant', 'Data Analyst Intern', 'Mobile App Developer'
];
const EXPERIENCE_COMPANIES = [
  'Self-Employed', 'TechCorp BD', 'DesignStudio', 'UIU Innovation Lab',
  'Fiverr', 'Upwork', 'Campus Startup', 'DataMinds'
];

const r = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[r(0, arr.length - 1)];

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gigverse',
      multipleStatements: true,
    });

    console.log('--- GigVerse Master Seed v3.0 ---');
    console.log('Wiping all existing data...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    const tables = ['Reviews', 'Orders', 'Gig_Images', 'Experiences', 'Gigs', 'User_Private_Info', 'User_Skills', 'Users'];
    for (const t of tables) {
      await connection.query(`TRUNCATE TABLE ${t}`);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('All tables truncated.');

    // PHASE 1: Generate 150 Users (100 Students, 25 Alumni, 25 Faculty)

    console.log('Generating 150 users...');
    const users = [];
    const passwordHash = await bcrypt.hash('gigverse123', 10);

    for (let i = 0; i < 150; i++) {
      const firstName = pick(FIRST_NAMES);
      const lastName = pick(LAST_NAMES);
      const name = `${firstName} ${lastName}`;

      // Deterministic role assignment: 0-99 = Student, 100-124 = Alumni, 125-149 = Faculty
      let roleId = 1;
      if (i >= 100 && i < 125) roleId = 2;
      else if (i >= 125) roleId = 3;

      const dept = pick(DEPARTMENTS);

      // Generate UIU ID for students and alumni
      const year = r(19, 25).toString();
      const trimester = r(1, 3).toString();
      const serial = r(1, 9999).toString().padStart(4, '0');
      const uiuId = roleId !== 3 ? `${dept.code}${year}${trimester}${serial}` : null;

      // Unified email architecture:
      // Students & Faculty: uiuEmail = UIU email, personalEmail = placeholder
      // Alumni: personalEmail = real email, uiuEmail = placeholder
      let uiuEmail, personalEmail;
      const uniqueSuffix = `${i}_${Date.now() % 100000}`;

      if (roleId === 1) {
        uiuEmail = `${firstName.toLowerCase()}${r(100, 999)}_${uniqueSuffix}@bss.uiu.ac.bd`;
        personalEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${uniqueSuffix}@placeholder.gigverse`;
      } else if (roleId === 3) {
        uiuEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${uniqueSuffix}@uiu.ac.bd`;
        personalEmail = `faculty_${uniqueSuffix}@placeholder.gigverse`;
      } else {
        // Alumni
        personalEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${uniqueSuffix}@gmail.com`;
        uiuEmail = `alumni_${uniqueSuffix}@placeholder.gigverse`;
      }

      const pvpPoints = r(200, 1500);
      const avgRating = (r(35, 50) / 10).toFixed(1);

      // Assign category for this user (even distribution)
      const categoryIndex = i % GIG_CATEGORIES.length;
      const category = GIG_CATEGORIES[categoryIndex];

      const profilePicUrl = pick(PREMIUM_AVATARS);
      const bio = pick(category.bios);

      const [res] = await connection.query(
        `INSERT INTO Users (RoleID, DeptID, Name, UiuId, UiuEmail, PersonalEmail, PasswordHash, PVP_Points, ProfilePicUrl, Bio, AverageRating) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [roleId, dept.id, name, uiuId, uiuEmail, personalEmail, passwordHash, pvpPoints, profilePicUrl, bio, avgRating]
      );

      const userId = res.insertId;
      users.push({ id: userId, roleId, deptId: dept.id, name, categoryIndex });

      // Private Info
      const countryPrefixes = ['+880', '+1', '+44', '+91', '+61', '+971', '+65'];
      const phonePrefix = pick(countryPrefixes);
      await connection.query(
        'INSERT INTO User_Private_Info (UserID, WhatsAppNumber) VALUES (?, ?)',
        [userId, `${phonePrefix}17${r(10000000, 99999999)}`]
      );

      // Experiences — 1-2 per user
      const expTitle = roleId === 3 ? pick(['Lecturer', 'Assistant Professor', 'Senior Lecturer', 'Associate Professor']) : pick(EXPERIENCE_TITLES_STUDENT);
      const expCompany = roleId === 3 ? 'United International University' : pick(EXPERIENCE_COMPANIES);
      await connection.query(
        'INSERT INTO Experiences (UserID, Title, Company, StartDate, Description) VALUES (?, ?, ?, ?, ?)',
        [userId, expTitle, expCompany, `${r(2020, 2024)}-0${r(1, 9)}-01`, 'Delivered high quality results with strong attention to detail and professional conduct.']
      );
      if (r(1, 10) > 5) {
        await connection.query(
          'INSERT INTO Experiences (UserID, Title, Company, StartDate, Description) VALUES (?, ?, ?, ?, ?)',
          [userId, pick(EXPERIENCE_TITLES_STUDENT), pick(EXPERIENCE_COMPANIES), `${r(2018, 2022)}-0${r(1, 9)}-01`, 'Collaborated with cross-functional teams to deliver impactful results.']
        );
      }

      // Skills — assign 2-4 skills aligned with user's category
      const assignedSkills = new Set();
      category.skills.forEach(s => assignedSkills.add(s));
      // Add 1-2 random extra skills
      for (let k = 0; k < r(1, 2); k++) {
        assignedSkills.add(r(1, 10));
      }
      for (const skillId of assignedSkills) {
        await connection.query('INSERT IGNORE INTO User_Skills (UserID, SkillID) VALUES (?, ?)', [userId, skillId]);
      }
    }
    console.log('150 users generated (100 Student / 25 Alumni / 25 Faculty).');

    // PHASE 2: Generate 200 Gigs — evenly distributed across all 7 categories
    console.log('Generating gigs with even category distribution...');
    let gigCount = 0;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      // Primary gig — matched to user's assigned category
      const category = GIG_CATEGORIES[user.categoryIndex];
      const title = pick(category.titles);
      const desc = `I will deliver professional-grade work for ${title}. Specialized in ${category.cat} with a track record of excellence within the UIU community. Fast turnaround and unlimited revisions.`;
      const price = r(15, 99) * 100;

      const [gigRes] = await connection.query(
        `INSERT INTO Gigs (ContributorID, Title, Description, BasePrice) VALUES (?, ?, ?, ?)`,
        [user.id, title, desc, price]
      );
      const gigId = gigRes.insertId;
      gigCount++;

      await connection.query(
        'INSERT INTO Gig_Images (GigID, ImageUrl, IsPrimary) VALUES (?, ?, 1)',
        [gigId, pick(PREMIUM_GIG_IMAGES)]
      );

      // Generate a completed order and a review
      let client = pick(users);
      while (client.id === user.id) client = pick(users);

      const [orderRes] = await connection.query(
        'INSERT INTO Orders (ClientID, ContributorID, GigID, Amount, OrderStatus) VALUES (?, ?, ?, ?, ?)',
        [client.id, user.id, gigId, price, 'Completed']
      );
      await connection.query(
        'INSERT INTO Reviews (OrderID, ReviewerID, Rating, Comment) VALUES (?, ?, ?, ?)',
        [orderRes.insertId, client.id, r(4, 5), pick(REVIEW_COMMENTS)]
      );

      // Secondary gig for ~33% of users (different category for search diversity)
      if (i % 3 === 0) {
        const nextCatIdx = (user.categoryIndex + r(1, 3)) % GIG_CATEGORIES.length;
        const nextCat = GIG_CATEGORIES[nextCatIdx];
        const title2 = pick(nextCat.titles) + ' for Startups';
        const price2 = r(20, 120) * 100;

        const [gigRes2] = await connection.query(
          `INSERT INTO Gigs (ContributorID, Title, Description, BasePrice) VALUES (?, ?, ?, ?)`,
          [user.id, title2, `Premium ${nextCat.cat} service. Delivering enterprise-quality results with a fast turnaround. Let's collaborate!`, price2]
        );
        gigCount++;
        await connection.query(
          'INSERT INTO Gig_Images (GigID, ImageUrl, IsPrimary) VALUES (?, ?, 1)',
          [gigRes2.insertId, pick(PREMIUM_GIG_IMAGES)]
        );
      }
    }
    console.log(`${gigCount} gigs generated across all 7 categories.`);

    await connection.end();
    console.log('--- Seeding complete! Platform is production-ready. ---');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
})();
