// ── GigVerse — Dashboard / Analytics Controller ─────────────────────────────
// Public platform stats + authenticated per-user stats.
const pool = require('../database/db');

// ── Platform-level Stats (Public) ───────────────────────────────────────────
exports.getStats = async (_req, res, next) => {
  try {
    const [[{ totalUsers }]] = await pool.query(
      'SELECT COUNT(*) AS totalUsers FROM Users'
    );
    const [[{ totalGigs }]] = await pool.query(
      'SELECT COUNT(*) AS totalGigs FROM Gigs'
    );
    const [[{ totalOrders }]] = await pool.query(
      'SELECT COUNT(*) AS totalOrders FROM Orders'
    );
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
      data: { totalUsers, totalGigs, totalOrders, topContributors },
    });
  } catch (err) {
    next(err);
  }
};

// ── Per-User Stats (Authenticated) ──────────────────────────────────────────
// Returns: activeOrders, totalSales, totalSpent, completedOrders
exports.getMyStats = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Active orders (where user is client OR contributor, status NOT completed/cancelled)
    const [[{ activeOrders }]] = await pool.query(
      `SELECT COUNT(*) AS activeOrders FROM Orders
       WHERE (ClientID = ? OR ContributorID = ?)
         AND OrderStatus NOT IN ('Completed', 'Cancelled')`,
      [userId, userId]
    );

    // Total sales (completed orders where user is contributor)
    const [[{ totalSales }]] = await pool.query(
      `SELECT COALESCE(SUM(Amount), 0) AS totalSales FROM Orders
       WHERE ContributorID = ? AND OrderStatus = 'Completed'`,
      [userId]
    );

    // Total spent (completed orders where user is client)
    const [[{ totalSpent }]] = await pool.query(
      `SELECT COALESCE(SUM(Amount), 0) AS totalSpent FROM Orders
       WHERE ClientID = ? AND OrderStatus = 'Completed'`,
      [userId]
    );

    // Completed orders count
    const [[{ completedOrders }]] = await pool.query(
      `SELECT COUNT(*) AS completedOrders FROM Orders
       WHERE (ClientID = ? OR ContributorID = ?)
         AND OrderStatus = 'Completed'`,
      [userId, userId]
    );

    // Pending acceptance count (orders waiting for this user to act)
    const [[{ pendingOrders }]] = await pool.query(
      `SELECT COUNT(*) AS pendingOrders FROM Orders
       WHERE ContributorID = ? AND OrderStatus = 'Pending_Acceptance'`,
      [userId]
    );

    return res.json({
      success: true,
      data: {
        activeOrders,
        totalSales: Number(totalSales),
        totalSpent: Number(totalSpent),
        completedOrders,
        pendingOrders,
      },
    });
  } catch (err) {
    next(err);
  }
};
