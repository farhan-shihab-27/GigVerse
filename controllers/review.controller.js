const pool = require('../database/db');

exports.createReview = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { orderId, reviewerId, rating, comment } = req.body;

    if (!orderId || !reviewerId || rating === undefined) {
      return res.status(400).json({ success: false, message: 'orderId, reviewerId, and rating are required.' });
    }

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5.' });
    }

    const [orders] = await conn.query(
      'SELECT OrderID, ContributorID, ClientID FROM Orders WHERE OrderID = ?', [orderId]
    );
    if (orders.length === 0) { conn.release(); return res.status(404).json({ success: false, message: 'Order not found.' }); }
    const order = orders[0];

    if (Number(reviewerId) !== order.ClientID) {
      conn.release();
      return res.status(403).json({ success: false, message: 'Only the client of this order can submit a review.' });
    }

    const [existing] = await conn.query('SELECT ReviewID FROM Reviews WHERE OrderID = ?', [orderId]);
    if (existing.length > 0) { conn.release(); return res.status(409).json({ success: false, message: 'A review for this order already exists.' }); }

    await conn.beginTransaction();

    const [reviewResult] = await conn.query(
      'INSERT INTO Reviews (OrderID, ReviewerID, Rating, Comment) VALUES (?, ?, ?, ?)',
      [orderId, reviewerId, ratingNum, comment || null]
    );

    if (ratingNum === 5) {
      await conn.query('UPDATE Users SET PVP_Points = PVP_Points + 10 WHERE UserID = ?', [order.ContributorID]);
    }

    const [avgRows] = await conn.query(
      'SELECT AVG(r.Rating) AS avg_rating FROM Reviews r JOIN Orders o ON r.OrderID = o.OrderID WHERE o.ContributorID = ?',
      [order.ContributorID]
    );
    const newAvg = avgRows[0].avg_rating || 0;
    await conn.query('UPDATE Users SET AverageRating = ? WHERE UserID = ?', [Number(newAvg).toFixed(2), order.ContributorID]);

    await conn.commit();

    return res.status(201).json({
      success: true,
      message: ratingNum === 5 ? 'Review submitted! +10 PVP Points awarded.' : 'Review submitted.',
      data: { reviewId: reviewResult.insertId, orderId: Number(orderId), contributorId: order.ContributorID, rating: ratingNum, pvpAwarded: ratingNum === 5 ? 10 : 0, newAverageRating: Number(newAvg).toFixed(2) },
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

exports.getReviewByOrder = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT r.*, u.Name AS ReviewerName FROM Reviews r JOIN Users u ON r.ReviewerID = u.UserID WHERE r.OrderID = ?',
      [req.params.orderId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Review not found.' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

exports.getReviewsByContributor = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT r.*, u.Name AS ReviewerName, g.Title AS GigTitle FROM Reviews r JOIN Orders o ON r.OrderID = o.OrderID JOIN Users u ON r.ReviewerID = u.UserID JOIN Gigs g ON o.GigID = g.GigID WHERE o.ContributorID = ? ORDER BY r.CreatedAt DESC',
      [req.params.userId]
    );
    return res.json({ success: true, count: rows.length, data: rows });
  } catch (err) { next(err); }
};
