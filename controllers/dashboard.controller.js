// ── GigVerse — Dashboard / Analytics Controller ─────────────────────────────
// Public platform stats + authenticated per-user stats + live telemetry.
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

// ── Executive Dashboard Telemetry (Authenticated) ───────────────────────────
// Single endpoint delivering all data needed by WorkspaceHome.jsx dashboard:
//   macroStats      — 4 KPI cards
//   velocityChart   — 6-month revenue vs escrow sparkline
//   distributionChart — category earnings doughnut
exports.getTelemetry = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // ── QUERY 1: Macro Stats ─────────────────────────────────────────────────
    // activeOrders: Dynamic count of concurrent records bound to current user session ID
    const [[macroActive]] = await pool.query(
      `SELECT COUNT(*) AS activeOrders
       FROM Orders
       WHERE (ClientID = ? OR ContributorID = ?)
         AND OrderStatus IN ('active', 'in_progress')`,
      [userId, userId]
    );

    // pvpPoints: Instant query fetching current total profile reputation points
    const [[macroPvp]] = await pool.query(
      `SELECT PVP_Points AS pvpPoints
       FROM Users
       WHERE UserID = ?`,
      [userId]
    );

    // avgRating: Floating-point scalar calculation derived from linked rating reviews table
    const [[macroRating]] = await pool.query(
      `SELECT COALESCE(AVG(rv.Rating), 0) AS avgRating
       FROM Reviews rv
       JOIN Orders o ON rv.OrderID = o.OrderID
       WHERE o.ContributorID = ?`,
      [userId]
    );

    // totalSales Ledger: Absolute summation of finalized transactions from the escrow pool
    const [[macroSales]] = await pool.query(
      `SELECT COALESCE(SUM(Amount), 0) AS totalSales
       FROM Orders
       WHERE ContributorID = ?
         AND OrderStatus = 'Completed'`,
      [userId]
    );

    // ── QUERY 2: 6-Month Velocity Chart ─────────────────────────────────────
    // Sub-query aggregation monitoring monthly velocity: Revenue vs Escrow
    const [revenueRows] = await pool.query(
      `SELECT
         DATE_FORMAT(CreatedAt, '%b')                        AS month,
         DATE_FORMAT(CreatedAt, '%Y-%m')                     AS monthKey,
         COALESCE(SUM(CASE WHEN OrderStatus = 'Completed' THEN Amount ELSE 0 END), 0) AS revenue,
         COALESCE(SUM(CASE WHEN OrderStatus NOT IN ('Completed','Cancelled') THEN Amount ELSE 0 END), 0) AS escrow
       FROM Orders
       WHERE ContributorID = ?
         AND CreatedAt >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY monthKey, month
       ORDER BY monthKey ASC`,
      [userId]
    );

    const velocityChart = buildSixMonthSlots(revenueRows);

    // ── QUERY 3: Category Distribution (Pie/Doughnut) ───────────────────────
    // Categorize all successful cash inflows utilizing conditional group-by functions
    // mapped to discrete disciplines. We use a CTE with ROW_NUMBER() to prevent
    // multiplying order amounts if a user has multiple skills in different categories.
    const [distRows] = await pool.query(
      `WITH OrderCategories AS (
         SELECT 
           o.OrderID,
           o.Amount,
           c.CategoryName AS category,
           ROW_NUMBER() OVER (PARTITION BY o.OrderID ORDER BY sk.SkillID ASC) as rn
         FROM Orders o
         JOIN Gigs         g   ON o.GigID         = g.GigID
         JOIN User_Skills  us  ON g.ContributorID = us.UserID
         JOIN Skills       sk  ON us.SkillID      = sk.SkillID
         JOIN Categories   c   ON sk.CategoryID   = c.CategoryID
         WHERE o.ContributorID = ?
           AND o.OrderStatus   = 'Completed'
       )
       SELECT
         category,
         COALESCE(SUM(Amount), 0) AS amountBDT,
         COUNT(OrderID)           AS count
       FROM OrderCategories
       WHERE rn = 1
       GROUP BY category
       ORDER BY amountBDT DESC`,
      [userId]
    );

    // Attach UI color palette
    const PALETTE = [
      { color: '#6366f1', lightColor: '#eef2ff' }, // indigo  — Development
      { color: '#ec4899', lightColor: '#fdf2f8' }, // pink    — Design
      { color: '#f59e0b', lightColor: '#fffbeb' }, // amber   — Tutoring
      { color: '#10b981', lightColor: '#f0fdf4' }, // emerald — Writing
      { color: '#3b82f6', lightColor: '#eff6ff' }, // blue    — Marketing
      { color: '#8b5cf6', lightColor: '#f5f3ff' }, // violet  — fallback
      { color: '#f97316', lightColor: '#fff7ed' }, // orange  — fallback
    ];

    const distributionChart = distRows.map((row, i) => ({
      category:   row.category,
      amountBDT:  Number(row.amountBDT),
      count:      Number(row.count),
      color:      (PALETTE[i] || PALETTE[PALETTE.length - 1]).color,
      lightColor: (PALETTE[i] || PALETTE[PALETTE.length - 1]).lightColor,
    }));

    return res.json({
      success: true,
      data: {
        macroStats: {
          activeOrders: macroActive.activeOrders,
          pvpPoints:    Number(macroPvp.pvpPoints || 0),
          avgRating:    Number(Number(macroRating.avgRating || 0).toFixed(2)),
          totalSales:   Number(macroSales.totalSales || 0),
        },
        velocityChart,
        distributionChart,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Helper: Build 6 consecutive month slots ──────────────────────────────────
// Ensures the chart always gets exactly 6 points even when the user has no
// orders in some months — avoids a broken/short sparkline on the frontend.
function buildSixMonthSlots(rows) {
  const slots = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-US', { month: 'short' }); // 'Jan', 'Feb', …

    const match = rows.find(r => r.monthKey === key);
    slots.push({
      month:   label,
      revenue: match ? Number(match.revenue) : 0,
      escrow:  match ? Number(match.escrow)  : 0,
    });
  }

  return slots;
}
