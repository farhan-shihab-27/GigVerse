// -- Auth Controller -------------------------------------------
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const pool   = require('../database/db');
const nodemailer = require('nodemailer');

const SALT_ROUNDS = 12;
const JWT_SECRET  = process.env.JWT_SECRET || 'change_me_to_a_long_random_string';
const JWT_EXPIRES = '7d';

// Temporary OTP Store (In production, use Redis)
const otpStore = new Map(); 

// Dummy transporter for development
const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false,
});

exports.requestOtp = async (req, res, next) => {
  try {
    const { name, uiuId, email, whatsAppNumber, password, roleId, deptId, dob } = req.body;

    // --- Legacy field support: accept uiuEmail/personalEmail from old clients ---
    const resolvedEmail = email || req.body.uiuEmail || req.body.personalEmail;

    if (!name || !resolvedEmail || !whatsAppNumber || !password || !roleId) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const isStudentOrAlumni = roleId === 1 || roleId === 2;
    const isFaculty = roleId === 3;

    // -- Email Constraints ---------------------------------------------------
    const emailLower = resolvedEmail.toLowerCase().trim();
    if (roleId === 1 || roleId === 3) {
      if (!emailLower.endsWith('.uiu.ac.bd')) {
        return res.status(403).json({ success: false, message: 'Access Denied: Only official UIU emails (.uiu.ac.bd) are allowed for Students and Faculty.' });
      }
    }

    // -- Check for duplicate emails ------------------------------------------
    const [existing] = await pool.query(
      'SELECT UserID FROM Users WHERE UiuEmail = ? OR PersonalEmail = ? OR (UiuId = ? AND UiuId IS NOT NULL)',
      [emailLower, emailLower, uiuId || null]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email or UIU ID already exists.' });
    }

    // -- The Master ID Validator (Students & Alumni) -------------------------
    if (isStudentOrAlumni && uiuId) {
      if (uiuId.length !== 10) {
        return res.status(400).json({ success: false, message: 'UIU Student ID must be exactly 10 digits.' });
      }

      // Fetch Department Code from DB
      const [deptRows] = await pool.query('SELECT DeptCode FROM Departments WHERE DeptID = ?', [deptId]);
      if (deptRows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid Department selected.' });
      }
      
      const expectedPrefix = deptRows[0].DeptCode;
      const prefix = uiuId.substring(0, 3);
      const yearStr = uiuId.substring(3, 5);
      const trimesterStr = uiuId.substring(5, 6);
      const serialStr = uiuId.substring(6, 10);

      // Prefix check
      if (prefix !== expectedPrefix) {
        return res.status(400).json({ success: false, message: `ID Prefix does not match the selected department (Should be ${expectedPrefix}).` });
      }

      // Year check
      if (isNaN(yearStr)) {
        return res.status(400).json({ success: false, message: 'Invalid Year digits in ID.' });
      }

      // Trimester check
      if (!['1', '2', '3'].includes(trimesterStr)) {
        return res.status(400).json({ success: false, message: 'Invalid Trimester digit. Must be 1, 2, or 3.' });
      }

      // Serial check
      if (isNaN(serialStr)) {
        return res.status(400).json({ success: false, message: 'Invalid Serial digits in ID.' });
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Determine which column(s) to use for storage
    // Students & Faculty: .uiu.ac.bd email goes to UiuEmail, PersonalEmail gets a placeholder
    // Alumni: any email goes to PersonalEmail, UiuEmail gets a placeholder
    let uiuEmail, personalEmail;
    if (roleId === 1 || roleId === 3) {
      uiuEmail = emailLower;
      personalEmail = `${emailLower.split('@')[0]}_personal@placeholder.gigverse`;
    } else {
      // Alumni
      personalEmail = emailLower;
      uiuEmail = `alumni_${Date.now()}@placeholder.gigverse`;
    }

    // Store in memory (expires in 10 mins)
    otpStore.set(emailLower, {
      otp,
      expires: Date.now() + 10 * 60 * 1000,
      userData: { name, uiuId, uiuEmail, personalEmail, whatsAppNumber, password, roleId, deptId, dob }
    });

    console.log(`[OTP GENERATED] for ${emailLower}: ${otp}`);

    // In a real app, you would actually send the email here using transporter.sendMail
    // await transporter.sendMail({ from: '"GigVerse" <noreply@gigverse.com>', to: emailLower, subject: 'GigVerse Verification Code', text: `Your OTP code is ${otp}` });

    return res.status(200).json({ success: true, message: 'OTP sent successfully to your email.' });
  } catch (err) {
    next(err);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const resolvedEmail = (req.body.email || req.body.uiuEmail || '').toLowerCase().trim();

    const record = otpStore.get(resolvedEmail);
    if (!record) {
      return res.status(400).json({ success: false, message: 'OTP request not found or expired. Please sign up again.' });
    }

    if (Date.now() > record.expires) {
      otpStore.delete(resolvedEmail);
      return res.status(400).json({ success: false, message: 'OTP has expired.' });
    }

    if (record.otp !== req.body.otp) {
      return res.status(400).json({ success: false, message: 'Invalid verification code.' });
    }

    // OTP is valid! Proceed to create user
    const { name, uiuId, uiuEmail, personalEmail, whatsAppNumber, password, roleId, deptId, dob } = record.userData;

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await pool.query(
      `INSERT INTO Users (RoleID, DeptID, Name, UiuId, UiuEmail, PersonalEmail, PasswordHash, DOB)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [roleId, deptId || 1, name, uiuId || null, uiuEmail, personalEmail, passwordHash, dob || null]
    );

    await pool.query('INSERT INTO User_Private_Info (UserID, WhatsAppNumber, BkashNumber, BankAccountDetails) VALUES (?, ?, NULL, NULL)', [result.insertId, whatsAppNumber || null]);
    await pool.query('UPDATE Users SET Bio = ? WHERE UserID = ?', ['New member of GigVerse', result.insertId]);

    otpStore.delete(resolvedEmail); // Clean up

    return res.status(201).json({ success: true, message: 'Registration successful.', data: { userId: result.insertId } });
  } catch (err) {
    next(err);
  }
};

exports.register = async (req, res, next) => {
  // Deprecated endpoint
  return res.status(400).json({ success: false, message: 'Use request-otp and verify-otp instead.' });
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Both email and password are required.' });
    }

    const emailLower = email.toLowerCase().trim();

    const [rows] = await pool.query(
      'SELECT * FROM Users WHERE UiuEmail = ? OR PersonalEmail = ?',
      [emailLower, emailLower]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.PasswordHash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const tokenPayload = { userId: user.UserID, roleId: user.RoleID, uiuEmail: user.UiuEmail };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    const { PasswordHash, ...safeUser } = user;

    return res.json({ success: true, message: 'Login successful.', data: { token, user: safeUser } });
  } catch (err) {
    next(err);
  }
};
