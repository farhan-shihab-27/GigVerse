// ── Order / Micro‑Escrow Controller ─────────────────────────
const pool = require('../database/db');

/**
 * POST /api/orders
 * Body: { clientId, gigId }
 *
 * Creates an order with PaymentStatus = 'Escrow_Held'.
 * Auto-resolves ContributorID and Amount from the Gig.
 */
exports.createOrder = async (req, res, next) => {
  try {
    const { clientId, gigId } = req.body;

    if (!clientId || !gigId) {
      return res.status(400).json({
        success: false,
        message: 'clientId and gigId are required.',
      });
    }

    // ── Fetch gig details ───────────────────────────────────
    const [gigs] = await pool.query('SELECT * FROM Gigs WHERE GigID = ?', [gigId]);
    if (gigs.length === 0) {
      return res.status(404).json({ success: false, message: 'Gig not found.' });
    }

    const gig = gigs[0];

    // ── Prevent self-ordering ───────────────────────────────
    if (Number(clientId) === gig.ContributorID) {
      return res.status(400).json({
        success: false,
        message: 'You cannot place an order on your own gig.',
      });
    }

    // ── Insert order ────────────────────────────────────────
    const [result] = await pool.query(
      `INSERT INTO Orders (ClientID, ContributorID, GigID, Amount, OrderStatus, PaymentStatus)
       VALUES (?, ?, ?, ?, 'Pending', 'Escrow_Held')`,
      [clientId, gig.ContributorID, gigId, gig.BasePrice]
    );

    return res.status(201).json({
      success: true,
      message: 'Order created. Payment held in escrow.',
      data: {
        orderId:       result.insertId,
        clientId:      Number(clientId),
        contributorId: gig.ContributorID,
        gigId:         Number(gigId),
        amount:        gig.BasePrice,
        orderStatus:   'Pending',
        paymentStatus: 'Escrow_Held',
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/orders/:id
 */
exports.getOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT o.*, g.Title AS GigTitle,
              cl.Name AS ClientName,
              co.Name AS ContributorName
       FROM Orders o
       JOIN Gigs  g  ON o.GigID         = g.GigID
       JOIN Users cl ON o.ClientID      = cl.UserID
       JOIN Users co ON o.ContributorID = co.UserID
       WHERE o.OrderID = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/orders/:id/status
 * Body: { orderStatus, paymentStatus? }
 *
 * Allows updating the order lifecycle (e.g. In_Progress → Completed).
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { orderStatus, paymentStatus } = req.body;

    if (!orderStatus) {
      return res.status(400).json({ success: false, message: 'orderStatus is required.' });
    }

    const fields = ['OrderStatus = ?'];
    const values = [orderStatus];

    if (paymentStatus) {
      fields.push('PaymentStatus = ?');
      values.push(paymentStatus);
    }

    values.push(id);
    const [result] = await pool.query(
      `UPDATE Orders SET ${fields.join(', ')} WHERE OrderID = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    return res.json({ success: true, message: 'Order status updated.' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/orders/user/:userId
 * Fetch all orders where the user is either client or contributor.
 */
exports.getOrdersByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const [rows] = await pool.query(
      `SELECT o.*, g.Title AS GigTitle
       FROM Orders o
       JOIN Gigs g ON o.GigID = g.GigID
       WHERE o.ClientID = ? OR o.ContributorID = ?
       ORDER BY o.CreatedAt DESC`,
      [userId, userId]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};
