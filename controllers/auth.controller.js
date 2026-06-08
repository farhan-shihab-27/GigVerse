// auth.controller.js — GigVerse Authentication (OTP, Signup, Login)
// ─────────────────────────────────────────────────────────────────
// Schema mapping (NEVER MODIFIED):
//   Users: UserID, RoleID, DeptID, Name, UiuId, UiuEmail, PersonalEmail,
//          PasswordHash, DOB, ProfilePicUrl, Bio, PVP_Points, AverageRating
//   User_Private_Info: UserID, WhatsAppNumber, BkashNumber, BankAccountDetails
// ─────────────────────────────────────────────────────────────────

const bcrypt      = require('bcrypt');
const jwt         = require('jsonwebtoken');
const pool        = require('../database/db');
const nodemailer  = require('nodemailer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const SALT_ROUNDS = 12;
const JWT_SECRET  = process.env.JWT_SECRET  || 'change_me_to_a_long_random_string';
const JWT_EXPIRES = '7d';

// ── In-memory OTP Store (swap for Redis in production at scale) ──────────────
const otpStore = new Map();

// ── Nodemailer Transporter (Module-level Singleton) ─────────────────────────
// Hoisted to module scope so the SMTP connection pool persists across requests.
// On serverless platforms, this survives within the same warm invocation context.
let transporter = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',               // Uses Gmail's well-known SMTP config
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,   // 16-char Gmail App Password
    },
    pool: true,                      // Reuse connections for throughput
    maxConnections: 3,
    maxMessages: 50,
    connectionTimeout: 30_000,       // 30 s to establish TCP connection
    greetingTimeout:   30_000,       // 30 s for SMTP greeting
    socketTimeout:     60_000,       // 60 s for socket inactivity
    family: 4,                       // Force IPv4 (avoids IPv6 issues on some hosts)
    tls: { rejectUnauthorized: false },
  });

  // Verify SMTP credentials on boot — logs success/failure without blocking
  transporter.verify()
    .then(() => console.log('✅  SMTP transporter verified — email dispatch ready.'))
    .catch((err) => console.error('🚨 SMTP transporter verification FAILED:', err.message));
} else {
  console.warn('[Nodemailer] SMTP_USER / SMTP_PASS not set — emails will only be logged to console.');
}

// ── Branded HTML email template ─────────────────────────────────────────────
function buildOtpEmail(name, otp) {
  return {
    subject: `${otp} — Your GigVerse Verification Code`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>GigVerse OTP</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#f26522 0%,#d95315 100%);padding:36px 40px;text-align:center;">
            <table cellpadding="0" cellspacing="0" align="center">
              <tr>
                <td style="background:rgba(255,255,255,0.15);border-radius:14px;padding:10px 16px;">
                  <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                    ⚡ GigVerse
                  </span>
                </td>
              </tr>
            </table>
            <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:14px 0 0;letter-spacing:0.3px;">
              UIU Campus Freelance Platform
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:44px 48px 36px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">
              Hello, ${name.split(' ')[0]}! 👋
            </h1>
            <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
              Here is your one-time verification code to complete your GigVerse registration.
            </p>

            <!-- OTP Box -->
            <div style="background:linear-gradient(135deg,#fff4eb 0%,#ffe6d1 100%);
                        border:2px solid #ffc8a1;border-radius:16px;
                        padding:28px;text-align:center;margin:0 0 28px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;
                         color:#b0420f;letter-spacing:2px;text-transform:uppercase;">
                Verification Code
              </p>
              <p style="margin:0;font-size:48px;font-weight:800;
                         color:#d95315;letter-spacing:14px;font-family:'Courier New',monospace;">
                ${otp}
              </p>
            </div>

            <p style="margin:0 0 12px;font-size:13px;color:#6b7280;line-height:1.6;">
              This code is valid for <strong style="color:#111827;">10 minutes</strong>.
              Do not share it with anyone.
            </p>
            <p style="margin:0;font-size:13px;color:#9ca3af;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:24px 48px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;line-height:1.8;">
              © 2026 GigVerse · Exclusively for
              <strong style="color:#f26522;">United International University</strong><br/>
              This is an automated email — please do not reply.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
  };
}

// ── POST /api/auth/request-otp ───────────────────────────────────────────────
exports.requestOtp = async (req, res, next) => {
  console.log('\n🔬 INCOMING OTP-REQUEST PAYLOAD:', JSON.stringify(req.body, null, 2));
  try {
    const {
      name, uiuId, email, whatsAppNumber, password,
      roleId, deptId, dob,
    } = req.body;

    // Accept legacy field aliases
    const resolvedEmail = (email || req.body.uiuEmail || req.body.personalEmail || '').toLowerCase().trim();

    // ── Required field guard ─────────────────────────────────────
    if (!name || !resolvedEmail || !whatsAppNumber || !password || !roleId) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    // ── UIU email enforcement (Students = 1, Faculty = 3) ────────
    if (roleId === 1 || roleId === 3) {
      if (!resolvedEmail.endsWith('.uiu.ac.bd')) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: Only official UIU emails (.uiu.ac.bd) are allowed for Students and Faculty.',
        });
      }
    }

    // ── Duplicate check ──────────────────────────────────────────
    let existing;
    try {
      console.log('[DEBUG] Running duplicate check for:', resolvedEmail, uiuId);
      [existing] = await pool.query(
        'SELECT UserID FROM Users WHERE UiuEmail = ? OR PersonalEmail = ? OR (UiuId = ? AND UiuId IS NOT NULL)',
        [resolvedEmail, resolvedEmail, uiuId || null],
      );
      console.log('[DEBUG] Duplicate check result:', existing.length, 'matches');
    } catch (dupErr) {
      console.error('🚨 SIGNUP CRASH REASON (duplicate check SELECT):', dupErr);
      return res.status(500).json({
        error: 'Registration Failed',
        details: dupErr.message,
        sqlMessage: dupErr.sqlMessage || null,
        code: dupErr.code || null,
      });
    }
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email or UIU ID already exists.',
      });
    }

    // ── UIU Student ID format validator (Students & Alumni) ──────
    const isStudentOrAlumni = roleId === 1 || roleId === 2;
    if (isStudentOrAlumni && uiuId) {
      if (uiuId.length !== 10 || isNaN(uiuId)) {
        return res.status(400).json({ success: false, message: 'UIU Student ID must be exactly 10 numeric digits.' });
      }
      const [deptRows] = await pool.query('SELECT DeptCode FROM Departments WHERE DeptID = ?', [deptId]);
      if (deptRows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid Department selected.' });
      }
      const expectedPrefix = deptRows[0].DeptCode;
      const prefix      = uiuId.substring(0, 3);
      const trimesterCh = uiuId.substring(5, 6);
      if (prefix !== expectedPrefix) {
        return res.status(400).json({
          success: false,
          message: `ID prefix mismatch — expected "${expectedPrefix}" for the selected department.`,
        });
      }
      if (!['1', '2', '3'].includes(trimesterCh)) {
        return res.status(400).json({ success: false, message: 'Invalid trimester digit in UIU ID (must be 1, 2, or 3).' });
      }
    }

    // ── Resolve UiuEmail & PersonalEmail columns ─────────────────
    let uiuEmail, personalEmail;
    if (roleId === 1 || roleId === 3) {
      // Student / Faculty: their .uiu.ac.bd IS the UIU email
      uiuEmail      = resolvedEmail;
      personalEmail = `${resolvedEmail.split('@')[0]}_personal@placeholder.gigverse`;
    } else {
      // Alumni: use a placeholder UIU email
      personalEmail = resolvedEmail;
      uiuEmail      = `alumni_${Date.now()}@placeholder.gigverse`;
    }

    // ── Generate 6-digit OTP ─────────────────────────────────────
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP + payload (expires 10 min)
    otpStore.set(resolvedEmail, {
      otp,
      expires:  Date.now() + 10 * 60 * 1000,
      userData: { name, uiuId, uiuEmail, personalEmail, whatsAppNumber, password, roleId, deptId, dob },
    });

    // ── Send email (BLOCKING — must confirm dispatch before responding) ────
    // transporter is the module-level singleton (null if SMTP not configured)
    if (!transporter) {
      console.error('🚨 NODEMAILER SMTP ERROR: Transporter is null — SMTP_USER / SMTP_PASS not configured.');
      // Still log OTP for local dev debugging
      console.log(`[OTP-DEV] ${resolvedEmail} → ${otp}`);
      return res.status(500).json({
        success: false,
        message: 'Email service is not configured. Please contact support.',
      });
    }

    const { subject, html } = buildOtpEmail(name, otp);
    try {
      const info = await transporter.sendMail({
        from: `"GigVerse Platform" <${process.env.SMTP_USER}>`,
        to:   resolvedEmail,
        subject,
        html,
      });
      console.log(`[OTP] Email dispatched to ${resolvedEmail} — SMTP response: ${info.response}`);
    } catch (mailErr) {
      console.error('🚨 NODEMAILER SMTP ERROR:', mailErr);
      // Aggressive propagation — throw so the outer catch returns 500
      throw mailErr;
    }

    // Log OTP to console for dev convenience (email was confirmed sent above)
    console.log(`[OTP] ${resolvedEmail} → ${otp}`);

    return res.status(200).json({ success: true, message: 'Verification code sent to your email.' });
  } catch (err) {
    console.error('🚨 SIGNUP CRASH REASON (requestOtp outer):', err);
    return res.status(500).json({
      error: 'Registration Failed',
      details: err.message,
      sqlMessage: err.sqlMessage || null,
      stack: err.stack || null,
    });
  }
};

// ── POST /api/auth/verify-otp ────────────────────────────────────────────────
exports.verifyOtp = async (req, res, next) => {
  console.log('\n🔬 INCOMING VERIFY-OTP PAYLOAD:', JSON.stringify(req.body, null, 2));
  try {
    const resolvedEmail = (req.body.email || req.body.uiuEmail || '').toLowerCase().trim();

    const record = otpStore.get(resolvedEmail);
    if (!record) {
      return res.status(400).json({ success: false, message: 'OTP request not found or expired. Please sign up again.' });
    }
    if (Date.now() > record.expires) {
      otpStore.delete(resolvedEmail);
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }
    if (record.otp !== String(req.body.otp).trim()) {
      return res.status(400).json({ success: false, message: 'Invalid verification code.' });
    }

    // ── OTP verified — create user ───────────────────────────────
    const { name, uiuId, uiuEmail, personalEmail, whatsAppNumber, password, roleId, deptId, dob } = record.userData;

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Clamp deptId to valid DB range (1–18)
    const safeDeptId = (Number(deptId) >= 1 && Number(deptId) <= 18) ? Number(deptId) : 1;

    // ── Gemini AI: Generate personalized welcome bio (graceful degradation) ──
    let generatedBio = 'Welcome to GigVerse!';
    try {
      if (process.env.GEMINI_API_KEY) {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const aiResult = await model.generateContent({
          contents: [{
            role: 'user',
            parts: [{ text: `Write a short, friendly one-sentence welcome bio (max 120 chars) for a new university freelance platform member named "${name}". No quotes around the output.` }],
          }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 60 },
        });
        const aiText = aiResult.response.text().trim();
        if (aiText && aiText.length > 0 && aiText.length <= 200) {
          generatedBio = aiText;
        }
      }
    } catch (aiErr) {
      console.warn('[AUTH] Gemini AI bio generation failed (non-blocking):', aiErr.message);
      // generatedBio stays as default — registration continues unaffected
    }

    // ── CRITICAL DB INSERTION — wrapped for deep error tracking ──
    let result;
    try {
      [result] = await pool.query(
        `INSERT INTO Users
           (RoleID, DeptID, Name, UiuId, UiuEmail, PersonalEmail, PasswordHash, DOB, Bio)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [roleId, safeDeptId, name, uiuId || null, uiuEmail, personalEmail, passwordHash, dob || null, generatedBio],
      );
      console.log('[AUTH] User inserted with ID:', result.insertId);
    } catch (dbErr) {
      console.error('CRITICAL DB INSERTION ERROR (Users table):', dbErr);
      return res.status(500).json({
        success: false,
        message: dbErr.message,
        sqlState: dbErr.sqlState || null,
        code: dbErr.code || null,
      });
    }

    try {
      await pool.query(
        `INSERT INTO User_Private_Info (UserID, WhatsAppNumber, BkashNumber, BankAccountDetails)
         VALUES (?, ?, NULL, NULL)`,
        [result.insertId, whatsAppNumber || null],
      );
      console.log('[AUTH] User_Private_Info inserted for UserID:', result.insertId);
    } catch (dbErr) {
      console.error('CRITICAL DB INSERTION ERROR (User_Private_Info table):', dbErr);
      return res.status(500).json({
        success: false,
        message: dbErr.message,
        sqlState: dbErr.sqlState || null,
        code: dbErr.code || null,
      });
    }

    otpStore.delete(resolvedEmail);

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to GigVerse.',
      data:    { userId: result.insertId },
    });
  } catch (err) {
    console.error('🚨 SIGNUP CRASH REASON (verifyOtp outer):', err);
    return res.status(500).json({
      error: 'Registration Failed',
      details: err.message,
      sqlMessage: err.sqlMessage || null,
      stack: err.stack || null,
    });
  }
};

// ── POST /api/auth/register (deprecated) ────────────────────────────────────
exports.register = async (_req, res) => {
  return res.status(410).json({ success: false, message: 'Deprecated. Use /request-otp and /verify-otp.' });
};

// ── POST /api/auth/login ─────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Both email and password are required.' });
    }

    const emailLower = email.toLowerCase().trim();
    const [rows] = await pool.query(
      'SELECT * FROM Users WHERE UiuEmail = ? OR PersonalEmail = ?',
      [emailLower, emailLower],
    );
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const user  = rows[0];
    const match = await bcrypt.compare(password, user.PasswordHash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { userId: user.UserID, roleId: user.RoleID, uiuEmail: user.UiuEmail },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES },
    );

    const { PasswordHash, ...safeUser } = user;

    return res.json({
      success: true,
      message: 'Login successful.',
      data:    { token, user: safeUser },
    });
  } catch (err) {
    next(err);
  }
};
