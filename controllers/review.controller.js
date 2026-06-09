const pool = require('../database/db');

// POST /reviews  (legacy — client-only, kept for backward compat)
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

    const [existing] = await conn.query(
      'SELECT ReviewID FROM Reviews WHERE OrderID = ? AND ReviewerID = ?', [orderId, reviewerId]
    );
    if (existing.length > 0) { conn.release(); return res.status(409).json({ success: false, message: 'You have already reviewed this order.' }); }

    await conn.beginTransaction();

    const revieweeId = order.ContributorID;
    const [reviewResult] = await conn.query(
      'INSERT INTO Reviews (OrderID, ReviewerID, RevieweeID, Rating, Comment) VALUES (?, ?, ?, ?, ?)',
      [orderId, reviewerId, revieweeId, ratingNum, comment || null]
    );

    if (ratingNum === 5) {
      await conn.query('UPDATE Users SET PVP_Points = PVP_Points + 10 WHERE UserID = ?', [revieweeId]);
    }

    // Recalculate reviewee's global average rating across all orders where they are the reviewee
    const [avgRows] = await conn.query(
      'SELECT AVG(Rating) AS avg_rating FROM Reviews WHERE RevieweeID = ?',
      [revieweeId]
    );
    const newAvg = avgRows[0].avg_rating || 0;
    await conn.query('UPDATE Users SET AverageRating = ? WHERE UserID = ?', [Number(newAvg).toFixed(2), revieweeId]);

    await conn.commit();

    return res.status(201).json({
      success: true,
      message: ratingNum === 5 ? 'Review submitted! +10 PVP Points awarded.' : 'Review submitted.',
      data: {
        reviewId: reviewResult.insertId,
        orderId: Number(orderId),
        revieweeId,
        rating: ratingNum,
        pvpAwarded: ratingNum === 5 ? 10 : 0,
        newAverageRating: Number(newAvg).toFixed(2),
      },
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// POST /reviews/mutual 
// Mutual feedback: both Client AND Contributor can review each other.
// Payload: { order_id, reviewer_id, reviewee_id, rating, comment }
exports.submitMutualFeedback = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { order_id, reviewer_id, reviewee_id, rating, comment } = req.body;

    // Validation 
    if (!order_id || !reviewer_id || !reviewee_id || rating === undefined) {
      return res.status(400).json({
        success: false,
        message: 'order_id, reviewer_id, reviewee_id, and rating are required.',
      });
    }

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5.',
      });
    }

    if (Number(reviewer_id) === Number(reviewee_id)) {
      return res.status(400).json({ success: false, message: 'You cannot review yourself.' });
    }

    // Verify order exists and both parties are legitimate
    const [orders] = await conn.query(
      'SELECT OrderID, ContributorID, ClientID, OrderStatus FROM Orders WHERE OrderID = ?',
      [order_id]
    );
    if (orders.length === 0) {
      conn.release();
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const order = orders[0];

    const numReviewerId  = Number(reviewer_id);
    const numRevieweeId  = Number(reviewee_id);
    const isClientReview       = numReviewerId === order.ClientID && numRevieweeId === order.ContributorID;
    const isContributorReview  = numReviewerId === order.ContributorID && numRevieweeId === order.ClientID;

    if (!isClientReview && !isContributorReview) {
      conn.release();
      return res.status(403).json({
        success: false,
        message: 'You are not a party to this order or the reviewer/reviewee pairing is invalid.',
      });
    }

    // Order must be in a reviewable state
    const reviewableStatuses = ['Delivered', 'Completed'];
    if (!reviewableStatuses.includes(order.OrderStatus)) {
      conn.release();
      return res.status(422).json({
        success: false,
        message: `Feedback can only be submitted for orders that are Delivered or Completed. Current status: ${order.OrderStatus}.`,
      });
    }

    // Prevent duplicate reviews
    const [existing] = await conn.query(
      'SELECT ReviewID FROM Reviews WHERE OrderID = ? AND ReviewerID = ?',
      [order_id, numReviewerId]
    );
    if (existing.length > 0) {
      conn.release();
      return res.status(409).json({
        success: false,
        message: 'You have already submitted feedback for this order.',
      });
    }

    // Atomically insert review + recalculate reviewee's average rating
    await conn.beginTransaction();

    const [reviewResult] = await conn.query(
      'INSERT INTO Reviews (OrderID, ReviewerID, RevieweeID, Rating, Comment) VALUES (?, ?, ?, ?, ?)',
      [order_id, numReviewerId, numRevieweeId, ratingNum, comment ? comment.trim() : null]
    );

    // Award +10 PVP points for a 5-star review
    if (ratingNum === 5) {
      await conn.query(
        'UPDATE Users SET PVP_Points = PVP_Points + 10 WHERE UserID = ?',
        [numRevieweeId]
      );
    }

    // Recalculate reviewee's global AverageRating
    const [avgRows] = await conn.query(
      'SELECT AVG(Rating) AS avg_rating FROM Reviews WHERE RevieweeID = ?',
      [numRevieweeId]
    );
    const newAvg = Number(avgRows[0].avg_rating || 0);
    await conn.query(
      'UPDATE Users SET AverageRating = ? WHERE UserID = ?',
      [newAvg.toFixed(2), numRevieweeId]
    );

    await conn.commit();

    return res.status(201).json({
      success: true,
      message: ratingNum === 5
        ? 'Feedback submitted! The reviewee earned +10 PVP Points for the 5-star rating.'
        : 'Feedback submitted successfully.',
      data: {
        reviewId:         reviewResult.insertId,
        orderId:          Number(order_id),
        reviewerId:       numReviewerId,
        revieweeId:       numRevieweeId,
        rating:           ratingNum,
        pvpAwarded:       ratingNum === 5 ? 10 : 0,
        newAverageRating: newAvg.toFixed(2),
      },
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// GET /reviews/order/:orderId 
// Returns all reviews for an order (up to 2 — one per party).
exports.getReviewByOrder = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, 
              reviewer.Name AS ReviewerName,
              reviewee.Name AS RevieweeName
       FROM Reviews r
       JOIN Users reviewer ON r.ReviewerID = reviewer.UserID
       LEFT JOIN Users reviewee ON r.RevieweeID = reviewee.UserID
       WHERE r.OrderID = ?
       ORDER BY r.CreatedAt ASC`,
      [req.params.orderId]
    );
    return res.json({ success: true, count: rows.length, data: rows });
  } catch (err) { next(err); }
};

// GET /reviews/order/:orderId/reviewer/:reviewerId 
// Checks whether a specific user has already reviewed this order.
exports.getMyReviewForOrder = async (req, res, next) => {
  try {
    const { orderId, reviewerId } = req.params;
    const [rows] = await pool.query(
      'SELECT ReviewID, Rating, Comment, CreatedAt FROM Reviews WHERE OrderID = ? AND ReviewerID = ?',
      [orderId, reviewerId]
    );
    if (rows.length === 0) {
      return res.json({ success: true, reviewed: false, data: null });
    }
    return res.json({ success: true, reviewed: true, data: rows[0] });
  } catch (err) { next(err); }
};

// GET /reviews/user/:userId 
// Returns all reviews received BY a user (as reviewee).
exports.getReviewsByContributor = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, 
              reviewer.Name AS ReviewerName,
              g.Title       AS GigTitle
       FROM Reviews r
       JOIN Orders  o        ON r.OrderID    = o.OrderID
       JOIN Users   reviewer ON r.ReviewerID = reviewer.UserID
       JOIN Gigs    g        ON o.GigID      = g.GigID
       WHERE r.RevieweeID = ?
       ORDER BY r.CreatedAt DESC`,
      [req.params.userId]
    );
    return res.json({ success: true, count: rows.length, data: rows });
  } catch (err) { next(err); }
};
