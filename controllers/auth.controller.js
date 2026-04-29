// ── Auth Controller ─────────────────────────────────────────
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const pool   = require('../database/db');

const SALT_ROUNDS = 12;
const JWT_SECRET  = process.env.JWT_SECRET || 'change_me_to_a_long_random_string';
const JWT_EXPIRES = '7d';
const VALID_EMAIL_DOMAINS = ['@bss.uiu.ac.bd', '@e.uiu.ac.bd'];

/**
 * POST /api/auth/register
 * Body: { name, uiuEmail, personalEmail, password, roleId, deptId, dob? }
 */
exports.register = async (req, res, next) => {
  try {
    const { name, uiuEmail, personalEmail, password, roleId, deptId, dob } = req.body;

    // ── Validate required fields ──────────────────────────────
    if (!name || !uiuEmail || !personalEmail || !password || !roleId || !deptId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, uiuEmail, personalEmail, password, roleId, deptId.',
      });
    }

    // ── Validate UIU email domain ─────────────────────────────
    const emailLower = uiuEmail.toLowerCase().trim();
    const domainValid = VALID_EMAIL_DOMAINS.some((d) => emailLower.endsWith(d));
    if (!domainValid) {
      return res.status(400).json({
        success: false,
        message: `UIU email must end with ${VALID_EMAIL_DOMAINS.join(' or ')}.`,
      });
    }

    // ── Check for duplicate emails ────────────────────────────
    const [existing] = await pool.query(
      'SELECT UserID FROM Users WHERE UiuEmail = ? OR PersonalEmail = ?',
      [emailLower, personalEmail.toLowerCase().trim()]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this UIU email or personal email already exists.',
      });
    }

    // ── Hash password & insert ────────────────────────────────
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await pool.query(
      `INSERT INTO Users (RoleID, DeptID, Name, UiuEmail, PersonalEmail, PasswordHash, DOB)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [roleId, deptId, name, emailLower, personalEmail.toLowerCase().trim(), passwordHash, dob || null]
    );

    // ── Create empty private info row ─────────────────────────
    await pool.query('INSERT INTO User_Private_Info (UserID) VALUES (?)', [result.insertId]);

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: { userId: result.insertId },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Accepts either UIU email OR personal email.
 * Returns a signed JWT on success.
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Both email and password are required.',
      });
    }

    const emailLower = email.toLowerCase().trim();

    // ── Look up by UIU email OR personal email ────────────────
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

    // ── Sign JWT ──────────────────────────────────────────────
    const tokenPayload = {
      userId:   user.UserID,
      roleId:   user.RoleID,
      uiuEmail: user.UiuEmail,
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    // Strip sensitive fields before returning user data
    const { PasswordHash, ...safeUser } = user;

    return res.json({
      success: true,
      message: 'Login successful.',
      data: { token, user: safeUser },
    });
  } catch (err) {
    next(err);
  }
};
