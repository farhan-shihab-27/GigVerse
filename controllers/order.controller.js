// ── Order / Micro-Escrow Controller ─────────────────────────
const pool = require('../database/db');

// create new order

exports.createOrder = async (req, res, next) => {
  try {
    const { clientId, gigId } = req.body;
    if (!clientId || !gigId) return res.status(400).json({ success: false, message: 'clientId and gigId are required.' });

    const [gigs] = await pool.query('SELECT * FROM Gigs WHERE GigID = ?', [gigId]);
    if (gigs.length === 0) return res.status(404).json({ success: false, message: 'Gig not found.' });
    const gig = gigs[0];

    if (Number(clientId) === gig.ContributorID) return res.status(400).json({ success: false, message: 'You cannot place an order on your own gig.' });

    const [result] = await pool.query(
      `INSERT INTO Orders (ClientID, ContributorID, GigID, Amount, OrderStatus, PaymentStatus)
       VALUES (?, ?, ?, ?, 'Pending', 'Escrow_Held')`,
      [clientId, gig.ContributorID, gigId, gig.BasePrice]
    );

    return res.status(201).json({
      success: true,
      message: 'Order created. Payment held in escrow.',
      data: { orderId: result.insertId, clientId: Number(clientId), contributorId: gig.ContributorID, gigId: Number(gigId), amount: gig.BasePrice, orderStatus: 'Pending', paymentStatus: 'Escrow_Held' },
    });
  } catch (err) { next(err); }
};

// Orders

exports.getOrder = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.*, g.Title AS GigTitle, cl.Name AS ClientName, co.Name AS ContributorName
       FROM Orders o JOIN Gigs g ON o.GigID = g.GigID JOIN Users cl ON o.ClientID = cl.UserID JOIN Users co ON o.ContributorID = co.UserID
       WHERE o.OrderID = ?`, [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Order not found.' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// update status of an order

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus, paymentStatus } = req.body;
    if (!orderStatus) return res.status(400).json({ success: false, message: 'orderStatus is required.' });
    const fields = ['OrderStatus = ?']; const values = [orderStatus];
    if (paymentStatus) { fields.push('PaymentStatus = ?'); values.push(paymentStatus); }
    values.push(req.params.id);
    const [result] = await pool.query(`UPDATE Orders SET ${fields.join(', ')} WHERE OrderID = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Order not found.' });
    return res.json({ success: true, message: 'Order status updated.' });
  } catch (err) { next(err); }
};

// get all orders for a specific user

exports.getOrdersByUser = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.*, g.Title AS GigTitle FROM Orders o JOIN Gigs g ON o.GigID = g.GigID
       WHERE o.ClientID = ? OR o.ContributorID = ? ORDER BY o.CreatedAt DESC`,
      [req.params.userId, req.params.userId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// fetch orders for the logged-in user

exports.getMyOrders = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const [rows] = await pool.query(
      `SELECT o.*, g.Title AS GigTitle, cl.Name AS ClientName, co.Name AS ContributorName
       FROM Orders o
       JOIN Gigs g  ON o.GigID = g.GigID
       JOIN Users cl ON o.ClientID = cl.UserID
       JOIN Users co ON o.ContributorID = co.UserID
       WHERE o.ClientID = ? OR o.ContributorID = ?
       ORDER BY o.CreatedAt DESC`,
      [userId, userId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// get contact details of the contributor

exports.getContributorContact = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const [rows] = await pool.query(
      `SELECT u.Name, u.PersonalEmail, upi.WhatsAppNumber
       FROM Users u
       LEFT JOIN User_Private_Info upi ON u.UserID = upi.UserID
       WHERE u.UserID = ?`,
      [userId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};
