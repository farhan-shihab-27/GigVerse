// ── User / Profile Controller ───────────────────────────────
const pool = require('../database/db');

/**
 * GET /api/users/:id
 * Public profile — includes UiuEmail for mailto: redirects.
 */
exports.getProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT u.UserID, u.Name, u.UiuEmail, u.PersonalEmail,
              u.DOB, u.ProfilePicUrl, u.Bio, u.PVP_Points, u.AverageRating,
              u.CreatedAt, r.RoleName, d.DeptName, d.DeptCode
       FROM Users u
       JOIN Roles       r ON u.RoleID = r.RoleID
       JOIN Departments d ON u.DeptID = d.DeptID
       WHERE u.UserID = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Attach skills
    const [skills] = await pool.query(
      `SELECT s.SkillID, s.SkillName, c.CategoryName
       FROM User_Skills us
       JOIN Skills     s ON us.SkillID    = s.SkillID
       JOIN Categories c ON s.CategoryID  = c.CategoryID
       WHERE us.UserID = ?`,
      [id]
    );

    return res.json({
      success: true,
      data: { ...rows[0], skills },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/:id
 * Update public profile fields (name, bio, profilePicUrl, dob).
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, bio, profilePicUrl, dob } = req.body;

    const fields = [];
    const values = [];

    if (name !== undefined)          { fields.push('Name = ?');          values.push(name); }
    if (bio !== undefined)           { fields.push('Bio = ?');           values.push(bio); }
    if (profilePicUrl !== undefined) { fields.push('ProfilePicUrl = ?'); values.push(profilePicUrl); }
    if (dob !== undefined)           { fields.push('DOB = ?');           values.push(dob); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update.' });
    }

    values.push(id);
    await pool.query(`UPDATE Users SET ${fields.join(', ')} WHERE UserID = ?`, values);

    return res.json({ success: true, message: 'Profile updated.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users/:id/skills
 * Body: { skillIds: [1, 3, 5] }
 * Replace all user skills (idempotent).
 */
exports.setSkills = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { skillIds } = req.body;

    if (!Array.isArray(skillIds)) {
      return res.status(400).json({ success: false, message: 'skillIds must be an array.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Clear existing
      await conn.query('DELETE FROM User_Skills WHERE UserID = ?', [id]);

      // Insert new
      if (skillIds.length > 0) {
        const rows = skillIds.map((sid) => [Number(id), sid]);
        await conn.query('INSERT INTO User_Skills (UserID, SkillID) VALUES ?', [rows]);
      }

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    return res.json({ success: true, message: 'Skills updated.' });
  } catch (err) {
    next(err);
  }
};

// ── Private Info (Strictly Protected) ───────────────────────

/**
 * GET /api/users/:id/private
 * Returns sensitive payment info. In production, gate this behind auth middleware.
 */
exports.getPrivateInfo = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      'SELECT * FROM User_Private_Info WHERE UserID = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Private info not found.' });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/:id/private
 * Body: { whatsAppNumber?, bkashNumber?, bankAccountDetails? }
 */
exports.updatePrivateInfo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { whatsAppNumber, bkashNumber, bankAccountDetails } = req.body;

    const fields = [];
    const values = [];

    if (whatsAppNumber !== undefined)     { fields.push('WhatsAppNumber = ?');     values.push(whatsAppNumber); }
    if (bkashNumber !== undefined)        { fields.push('BkashNumber = ?');        values.push(bkashNumber); }
    if (bankAccountDetails !== undefined) { fields.push('BankAccountDetails = ?'); values.push(bankAccountDetails); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update.' });
    }

    values.push(id);
    const [result] = await pool.query(
      `UPDATE User_Private_Info SET ${fields.join(', ')} WHERE UserID = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Private info record not found.' });
    }

    return res.json({ success: true, message: 'Private info updated.' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/leaderboard
 * Top contributors ranked by PVP_Points descending.
 */
exports.getLeaderboard = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 25, 100);

    const [rows] = await pool.query(
      `SELECT u.UserID, u.Name, u.UiuEmail, u.ProfilePicUrl,
              u.PVP_Points, u.AverageRating,
              r.RoleName, d.DeptName
       FROM Users u
       JOIN Roles       r ON u.RoleID = r.RoleID
       JOIN Departments d ON u.DeptID = d.DeptID
       ORDER BY u.PVP_Points DESC
       LIMIT ?`,
      [limit]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};
