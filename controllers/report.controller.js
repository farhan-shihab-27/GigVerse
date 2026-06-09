// GigVerse — Report Controller
// Handles manual user-submitted reports for admin review.
const pool = require('../database/db');

// Submit Report
exports.submitReport = async (req, res, next) => {
  try {
    const { orderId, reportedUserId, reason } = req.body;
    const userId = req.user.userId;

    if (!orderId || !reportedUserId || !reason || !String(reason).trim()) {
      return res.status(400).json({ success: false, message: 'orderId, reportedUserId, and a non-empty reason are required.' });
    }

    // Verify the reporter is a party in this order
    const [orders] = await pool.query('SELECT * FROM Orders WHERE OrderID = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const order = orders[0];

    if (order.ClientID !== userId && order.ContributorID !== userId) {
      return res.status(403).json({ success: false, message: 'You must be a party in this order to submit a report.' });
    }

    const [result] = await pool.query(
      'INSERT INTO Reports (reporter_id, reported_user_id, order_id, reason, is_auto_generated) VALUES (?, ?, ?, ?, 0)',
      [userId, reportedUserId, orderId, String(reason).trim()]
    );

    return res.status(201).json({
      success: true,
      message: 'Report submitted successfully.',
      data: { reportId: result.insertId },
    });
  } catch (err) {
    next(err);
  }
};
