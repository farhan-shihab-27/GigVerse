// ── Auth Controller ─────────────────────────────────────────
const bcrypt = require('bcrypt');
const pool   = require('../database/db');

const SALT_ROUNDS = 12;
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
 * Body: { uiuEmail, password }
 */
exports.login = async (req, res, next) => {
  try {
    const { uiuEmail, password } = req.body;

    if (!uiuEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Both uiuEmail and password are required.',
      });
    }

    const [rows] = await pool.query(
      'SELECT * FROM Users WHERE UiuEmail = ?',
      [uiuEmail.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.PasswordHash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Return user data (excluding sensitive fields).
    // NOTE: In production, you would issue a JWT here.
    const { PasswordHash, ...safeUser } = user;

    return res.json({
      success: true,
      message: 'Login successful.',
      data: { user: safeUser },
    });
  } catch (err) {
    next(err);
  }
};
