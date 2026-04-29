// ── Dashboard / Analytics Controller ────────────────────────
const pool = require('../database/db');

/**
 * GET /api/dashboard/stats
 * Returns aggregate platform metrics:
 *   - Total Users
 *   - Total active Gigs
 *   - Top 3 Contributors by PVP_Points
 */
exports.getStats = async (_req, res, next) => {
  try {
    // ── Total Users ───────────────────────────────────────────
    const [[{ totalUsers }]] = await pool.query(
      'SELECT COUNT(*) AS totalUsers FROM Users'
    );

    // ── Total Gigs ────────────────────────────────────────────
    const [[{ totalGigs }]] = await pool.query(
      'SELECT COUNT(*) AS totalGigs FROM Gigs'
    );

    // ── Total Orders ──────────────────────────────────────────
    const [[{ totalOrders }]] = await pool.query(
      'SELECT COUNT(*) AS totalOrders FROM Orders'
    );

    // ── Top 3 Contributors (by PVP_Points DESC) ───────────────
    const [topContributors] = await pool.query(
      `SELECT u.UserID, u.Name, u.UiuEmail, u.ProfilePicUrl,
              u.PVP_Points, u.AverageRating,
              r.RoleName, d.DeptName
       FROM Users u
       JOIN Roles       r ON u.RoleID = r.RoleID
       JOIN Departments d ON u.DeptID = d.DeptID
       ORDER BY u.PVP_Points DESC
       LIMIT 3`
    );

    return res.json({
      success: true,
      data: {
        totalUsers,
        totalGigs,
        totalOrders,
        topContributors,
      },
    });
  } catch (err) {
    next(err);
  }
};
