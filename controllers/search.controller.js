// ── Smart Search Controller ─────────────────────────────────
const pool = require('../database/db');

/**
 * GET /api/search/contributors?skill=Logo+Design
 *
 * Fetches contributors by SkillName using JOINs across
 * Users → User_Skills → Skills.
 *
 * CRITICAL: Results are ranked by PVP_Points DESC so top
 * contributors always surface first.
 */
exports.searchBySkill = async (req, res, next) => {
  try {
    const { skill } = req.query;

    if (!skill || skill.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter "skill" is required.',
      });
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
       ORDER BY u.PVP_Points DESC`,
      [`%${skill.trim()}%`]
    );

    return res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/search/skills
 * List all available skills grouped by category.
 */
exports.listSkills = async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.SkillID, s.SkillName, c.CategoryID, c.CategoryName
       FROM Skills     s
       JOIN Categories c ON s.CategoryID = c.CategoryID
       ORDER BY c.CategoryName, s.SkillName`
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};
