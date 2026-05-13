// controllers/search.controller.js — Enhanced autocomplete with grouped results
const pool = require('../database/db');

// GET /api/search/autocomplete?q=term  — returns grouped { skills, users }
exports.autocomplete = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json({ success: true, data: { skills: [], users: [] } });
    const like = `%${q}%`;

    const [skills] = await pool.query(
      `SELECT s.SkillID AS id, s.SkillName AS label, c.CategoryName AS sub
       FROM Skills s JOIN Categories c ON s.CategoryID = c.CategoryID
       WHERE s.SkillName LIKE ?
       ORDER BY s.SkillName LIMIT 5`,
      [like]
    );

    const [users] = await pool.query(
      `SELECT u.UserID AS id, u.Name AS label, d.DeptName AS sub,
              u.ProfilePicUrl AS avatar, u.PVP_Points
       FROM Users u JOIN Departments d ON u.DeptID = d.DeptID
       WHERE u.Name LIKE ?
         AND u.UiuEmail NOT LIKE '%_deleted_%'
       ORDER BY u.PVP_Points DESC LIMIT 5`,
      [like]
    );

    return res.json({ success: true, data: { skills, users } });
  } catch (err) { next(err); }
};

// GET /api/search/contributors?skill=term
exports.searchBySkill = async (req, res, next) => {
  try {
    const { skill } = req.query;
    if (!skill || skill.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Query parameter "skill" is required.' });
    }

    const [rows] = await pool.query(
      `SELECT DISTINCT
              u.UserID, u.Name, u.UiuEmail, u.ProfilePicUrl,
              u.Bio, u.PVP_Points, u.AverageRating,
              r.RoleName, d.DeptName, d.DeptCode,
              s.SkillName, c.CategoryName
       FROM Users        u
       JOIN User_Skills  us ON u.UserID       = us.UserID
       JOIN Skills       s  ON us.SkillID     = s.SkillID
       JOIN Categories   c  ON s.CategoryID   = c.CategoryID
       JOIN Roles        r  ON u.RoleID       = r.RoleID
       JOIN Departments  d  ON u.DeptID       = d.DeptID
       WHERE s.SkillName LIKE ?
         AND u.UiuEmail NOT LIKE '%_deleted_%'
       ORDER BY u.PVP_Points DESC`,
      [`%${skill.trim()}%`]
    );

    return res.json({ success: true, count: rows.length, data: rows });
  } catch (err) { next(err); }
};

// GET /api/search/skills
exports.listSkills = async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.SkillID, s.SkillName, c.CategoryID, c.CategoryName
       FROM Skills s JOIN Categories c ON s.CategoryID = c.CategoryID
       ORDER BY c.CategoryName, s.SkillName`
    );
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};
