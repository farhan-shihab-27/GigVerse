//  User / Profile Controller 
const pool   = require('../database/db');
const bcrypt = require('bcryptjs');

// Fetch public profile data

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

// update user profile (name, bio, etc.)

exports.updateProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, bio, profilePicUrl, dob } = req.body;

    const fields = [];
    const values = [];

    if (name !== undefined) { fields.push('Name = ?'); values.push(name); }
    if (bio !== undefined) { fields.push('Bio = ?'); values.push(bio); }
    if (profilePicUrl !== undefined) { fields.push('ProfilePicUrl = ?'); values.push(profilePicUrl); }
    if (dob !== undefined) { fields.push('DOB = ?'); values.push(dob); }

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

// update user skills

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

// Private Info (Strictly Protected) 
// get sensitive payment info

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

// Update Payment details (Whatsapp, bKash)

exports.updatePrivateInfo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { whatsAppNumber, bkashNumber, bankAccountDetails } = req.body;

    const fields = [];
    const values = [];

    if (whatsAppNumber !== undefined) { fields.push('WhatsAppNumber = ?'); values.push(whatsAppNumber); }
    if (bkashNumber !== undefined) { fields.push('BkashNumber = ?'); values.push(bkashNumber); }
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

// get top contributors for leaderboard

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

// get full profile of the logged-in user

exports.getMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const [rows] = await pool.query(
      `SELECT u.UserID, u.Name, u.UiuEmail, u.PersonalEmail,
              u.DOB, u.ProfilePicUrl, u.Bio, u.PVP_Points, u.AverageRating,
              u.CreatedAt, r.RoleName, d.DeptName, d.DeptCode,
              p.WhatsAppNumber, p.BkashNumber, p.BankAccountDetails
       FROM Users u
       JOIN Roles            r ON u.RoleID = r.RoleID
       JOIN Departments      d ON u.DeptID = d.DeptID
       LEFT JOIN User_Private_Info p ON u.UserID = p.UserID
       WHERE u.UserID = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Attach skills
    const [skills] = await pool.query(
      `SELECT s.SkillID, s.SkillName, c.CategoryName
       FROM User_Skills us
       JOIN Skills     s ON us.SkillID   = s.SkillID
       JOIN Categories c ON s.CategoryID = c.CategoryID
       WHERE us.UserID = ?`,
      [userId]
    );

    return res.json({ success: true, data: { ...rows[0], skills } });
  } catch (err) {
    next(err);
  }
};

// update public and private info together

exports.updateMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { name, bio, profilePicUrl, dob, whatsAppNumber, bkashNumber, bankAccountDetails } = req.body;

    // ── Update Users table fields ──────────────────────────
    const userFields = [];
    const userValues = [];
    if (name !== undefined) { userFields.push('Name = ?'); userValues.push(name); }
    if (bio !== undefined) { userFields.push('Bio = ?'); userValues.push(bio); }
    if (profilePicUrl !== undefined) { userFields.push('ProfilePicUrl = ?'); userValues.push(profilePicUrl); }
    if (dob !== undefined) { userFields.push('DOB = ?'); userValues.push(dob); }

    if (userFields.length > 0) {
      userValues.push(userId);
      await pool.query(`UPDATE Users SET ${userFields.join(', ')} WHERE UserID = ?`, userValues);
    }

    // ── Update User_Private_Info table fields ──────────────
    const privateFields = [];
    const privateValues = [];
    if (whatsAppNumber !== undefined) { privateFields.push('WhatsAppNumber = ?'); privateValues.push(whatsAppNumber); }
    if (bkashNumber !== undefined) { privateFields.push('BkashNumber = ?'); privateValues.push(bkashNumber); }
    if (bankAccountDetails !== undefined) { privateFields.push('BankAccountDetails = ?'); privateValues.push(bankAccountDetails); }

    if (privateFields.length > 0) {
      privateValues.push(userId);
      await pool.query(`UPDATE User_Private_Info SET ${privateFields.join(', ')} WHERE UserID = ?`, privateValues);
    }

    if (userFields.length === 0 && privateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update.' });
    }

    return res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (err) {
    next(err);
  }
};

// get private info of the logged-in user

exports.getMyPrivateInfo = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM User_Private_Info WHERE UserID = ?',
      [req.user.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Private info not found.' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// update private info of the logged-in user

exports.updateMyPrivateInfo = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { whatsAppNumber, bkashNumber, bankAccountDetails } = req.body;

    const fields = [];
    const values = [];
    if (whatsAppNumber !== undefined) { fields.push('WhatsAppNumber = ?'); values.push(whatsAppNumber); }
    if (bkashNumber !== undefined) { fields.push('BkashNumber = ?'); values.push(bkashNumber); }
    if (bankAccountDetails !== undefined) { fields.push('BankAccountDetails = ?'); values.push(bankAccountDetails); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update.' });
    }

    values.push(userId);
    await pool.query(`UPDATE User_Private_Info SET ${fields.join(', ')} WHERE UserID = ?`, values);

    return res.json({ success: true, message: 'Private info updated.' });
  } catch (err) {
    next(err);
  }
};

// search users by skill or category

exports.getUsersBySkill = async (req, res, next) => {
  try {
    const skill = req.query.skill || '';
    const searchQuery = `%${skill}%`;
    const [rows] = await pool.query(
      `SELECT DISTINCT u.UserID, u.Name, u.ProfilePicUrl, u.PVP_Points, u.AverageRating,
              r.RoleName, d.DeptName
       FROM Users u
       JOIN Roles r ON u.RoleID = r.RoleID
       JOIN Departments d ON u.DeptID = d.DeptID
       JOIN User_Skills us ON u.UserID = us.UserID
       JOIN Skills s ON us.SkillID = s.SkillID
       JOIN Categories c ON s.CategoryID = c.CategoryID
       WHERE c.CategoryName LIKE ? OR s.SkillName LIKE ?
       ORDER BY u.PVP_Points DESC
       LIMIT 50`,
      [searchQuery, searchQuery]
    );

    // For each user, attach their skills
    if (rows.length > 0) {
      const userIds = rows.map(u => u.UserID);
      const [skills] = await pool.query(
        `SELECT us.UserID, s.SkillName 
         FROM User_Skills us 
         JOIN Skills s ON us.SkillID = s.SkillID 
         WHERE us.UserID IN (?)`,
        [userIds]
      );

      const skillsMap = {};
      skills.forEach(s => {
        if (!skillsMap[s.UserID]) skillsMap[s.UserID] = [];
        skillsMap[s.UserID].push(s.SkillName);
      });

      rows.forEach(u => {
        u.Skills = skillsMap[u.UserID] || [];
      });
    }

    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// get public profile for portfolio page

exports.getPublicProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Core Profile & Contact Info
    const [users] = await pool.query(
      `SELECT u.UserID, u.RoleID, u.Name, u.Bio, u.PVP_Points, u.ProfilePicUrl, u.AverageRating, u.CreatedAt, u.PersonalEmail,
              p.WhatsAppNumber
       FROM Users u
       LEFT JOIN User_Private_Info p ON u.UserID = p.UserID
       WHERE u.UserID = ?`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const user = users[0];

    // 2. Gigs created by this user
    const [gigs] = await pool.query(
      `SELECT g.GigID, g.Title, g.Description, g.BasePrice,
              gi.ImageUrl AS PrimaryImage
       FROM Gigs g
       LEFT JOIN Gig_Images gi ON gi.GigID = g.GigID AND gi.IsPrimary = TRUE
       WHERE g.ContributorID = ?
       ORDER BY g.CreatedAt DESC`,
      [id]
    );
    user.Gigs = gigs;

    // 3. Experiences
    const [experiences] = await pool.query(
      `SELECT Title, Company, StartDate, EndDate, Description 
       FROM Experiences 
       WHERE UserID = ? 
       ORDER BY StartDate DESC`,
      [id]
    );
    user.Experiences = experiences;

    // 4. Reviews received (where user is the contributor)
    const [reviews] = await pool.query(
      `SELECT r.Rating, r.Comment, r.CreatedAt, 
              client.Name AS ReviewerName, client.ProfilePicUrl AS ReviewerPic
       FROM Reviews r
       JOIN Orders o ON r.OrderID = o.OrderID
       JOIN Users client ON r.ReviewerID = client.UserID
       WHERE o.ContributorID = ?
       ORDER BY r.CreatedAt DESC
       LIMIT 10`,
      [id]
    );
    user.Reviews = reviews;

    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    console.error('getPublicProfile Error:', err.message, err);
    next(err);
  }
};

// ── GET /api/users/profile/status ────────────────────────────────────────────
exports.checkProfileCompletion = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const [[user]] = await pool.query(
      'SELECT Bio, ProfilePicUrl FROM Users WHERE UserID = ?', [userId]
    );
    const [[{ skillCount }]] = await pool.query(
      'SELECT COUNT(*) AS skillCount FROM User_Skills WHERE UserID = ?', [userId]
    );
    const missing = [];
    if (!user.ProfilePicUrl) missing.push('avatar');
    if (!user.Bio || user.Bio === 'New member of GigVerse') missing.push('bio');
    if (Number(skillCount) < 3) missing.push('skills');
    return res.json({ success: true, data: { isComplete: missing.length === 0, missing } });
  } catch (err) { next(err); }
};

// ── POST /api/users/profile/complete ─────────────────────────────────────────
// Accepts { bio, profilePicUrl, deptId, skillNames:[{category,skill}] }
// Auto-inserts missing Categories and Skills, then syncs User_Skills.
exports.completeProfile = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const userId = req.user.userId;
    const { bio, profilePicUrl, deptId, skillNames = [] } = req.body;

    await conn.beginTransaction();

    // 1. Update Users table
    const uFields = []; const uVals = [];
    if (bio)           { uFields.push('Bio = ?');           uVals.push(bio); }
    if (profilePicUrl) { uFields.push('ProfilePicUrl = ?'); uVals.push(profilePicUrl); }
    if (deptId)        { uFields.push('DeptID = ?');        uVals.push(Number(deptId)); }
    if (uFields.length > 0) {
      uVals.push(userId);
      await conn.query(`UPDATE Users SET ${uFields.join(', ')} WHERE UserID = ?`, uVals);
    }

    // 2. Resolve / auto-insert Categories and Skills, collect SkillIDs
    const skillIdSet = [];
    for (const { category, skill } of skillNames) {
      // Upsert category
      await conn.query('INSERT IGNORE INTO Categories (CategoryName) VALUES (?)', [category]);
      const [[cat]] = await conn.query(
        'SELECT CategoryID FROM Categories WHERE CategoryName = ?', [category]
      );
      // Upsert skill
      await conn.query(
        'INSERT IGNORE INTO Skills (CategoryID, SkillName) VALUES (?, ?)',
        [cat.CategoryID, skill]
      );
      const [[sk]] = await conn.query(
        'SELECT SkillID FROM Skills WHERE SkillName = ? AND CategoryID = ?',
        [skill, cat.CategoryID]
      );
      skillIdSet.push(sk.SkillID);
    }

    // 3. Replace User_Skills
    await conn.query('DELETE FROM User_Skills WHERE UserID = ?', [userId]);
    if (skillIdSet.length > 0) {
      await conn.query(
        'INSERT INTO User_Skills (UserID, SkillID) VALUES ?',
        [skillIdSet.map(sid => [userId, sid])]
      );
    }

    await conn.commit();
    return res.json({ success: true, message: 'Profile completed successfully.' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// ── DELETE /api/users/account ─────────────────────────────────────────────────
// Soft-delete: timestamps UiuEmail + PersonalEmail + WhatsAppNumber so the real
// addresses are freed from UNIQUE constraints instantly — no hard data wipe.
exports.deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, message: 'Password is required.' });

    // 1. Verify password
    const [[user]] = await pool.query(
      'SELECT PasswordHash FROM Users WHERE UserID = ?', [userId]
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const valid = await bcrypt.compare(password, user.PasswordHash);
    if (!valid) return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });

    const ts = Math.floor(Date.now() / 1000); // Unix timestamp

    // 2. Pseudo-archive: append _deleted_<ts> to unique identity fields
    await pool.query(
      `UPDATE Users SET
         UiuEmail      = CONCAT(UiuEmail, '_deleted_', ?),
         PersonalEmail = CONCAT(PersonalEmail, '_deleted_', ?)
       WHERE UserID = ?`,
      [ts, ts, userId]
    );

    // 3. Free WhatsApp number (may also be used for re-signup)
    await pool.query(
      `UPDATE User_Private_Info SET
         WhatsAppNumber = CONCAT(IFNULL(WhatsAppNumber, ''), '_deleted_', ?)
       WHERE UserID = ?`,
      [ts, userId]
    );

    return res.json({ success: true, message: 'Your account has been deactivated. All personal data has been anonymised.' });
  } catch (err) { next(err); }
};
