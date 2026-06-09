// GigVerse — Universal Notification Controller
// Handles CRUD for notifications + a shared helper for cross-controller use.
const pool = require('../database/db');

// Shared Helper: Create a notification from ANY controller
/**
 * Inserts a notification row. Called by order, payment, review controllers.
 * @param {number}      userId    - Recipient user ID
 * @param {string}      type      - 'order' | 'milestone' | 'review' | 'message' | 'dispute' | 'system'
 * @param {string}      title     - Short headline
 * @param {string}      content   - Body text
 * @param {number|null} relatedId - Related entity ID (OrderID, ReviewID, etc.)
 */
async function createNotification(userId, type, title, content, relatedId = null) {
  try {
    await pool.query(
      `INSERT INTO Notifications (UserID, Type, RelatedID, Title, Content)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, type, relatedId, title, content]
    );
  } catch (err) {
    // Non-critical — log but never crash the parent operation
    console.error('[NOTIFICATION ERROR] Failed to create notification:', err.message);
  }
}

// GET /api/notifications — Fetch user's notifications (paginated)
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const limit  = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;

    const [rows] = await pool.query(
      `SELECT NotificationID, UserID, Type, RelatedID, Title, Content, IsRead, CreatedAt
       FROM Notifications
       WHERE UserID = ?
       ORDER BY CreatedAt DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM Notifications WHERE UserID = ?',
      [userId]
    );

    return res.json({
      success: true,
      data: rows,
      pagination: { total, limit, offset },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/notifications/unread-count 
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const [[{ count }]] = await pool.query(
      'SELECT COUNT(*) AS count FROM Notifications WHERE UserID = ? AND IsRead = FALSE',
      [userId]
    );
    return res.json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notifications/:id/read — Mark single notification as read 
const markAsRead = async (req, res, next) => {
  try {
    const userId         = req.user.userId;
    const notificationId = req.params.id;

    const [result] = await pool.query(
      'UPDATE Notifications SET IsRead = TRUE WHERE NotificationID = ? AND UserID = ?',
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notifications/read-all — Mark all as read 
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    await pool.query(
      'UPDATE Notifications SET IsRead = TRUE WHERE UserID = ? AND IsRead = FALSE',
      [userId]
    );
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
};

// Exports 
module.exports = {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
