// ── Premium Simulated Escrow Payment Controller ─────────────────────────────
// Processes escrow payments via Mobile Money (bKash, Nagad, Rocket) or Bank Transfer.
// Includes enterprise-grade error logging for Vercel ↔ Aiven MySQL debugging.
// + Smart Dispute & Compensation Logic (Release, Cancel, Dispute)
const pool = require('../database/db');
const crypto = require('crypto');
const { createNotification } = require('./notification.controller');

// Valid payment methods
const VALID_METHODS = ['bkash', 'nagad', 'rocket', 'bank'];

// Valid bank names (exact match)
const VALID_BANKS = [
  'BRAC Bank', 'The City Bank', 'Eastern Bank (EBL)', 'Dutch-Bangla Bank (DBBL)',
  'Islami Bank Bangladesh', 'Prime Bank', 'Mutual Trust Bank (MTB)',
  'Standard Chartered Bangladesh', 'Bank Asia', 'United Commercial Bank (UCB)',
  'Trust Bank', 'Mercantile Bank', 'Dhaka Bank', 'Jamuna Bank',
  'Southeast Bank', 'Pubali Bank', 'AB Bank', 'NCC Bank',
  'Shahjalal Islami Bank', 'HSBC Bangladesh',
];

/**
 * Logs detailed MySQL/network connection errors for Vercel ↔ Aiven debugging.
 * @param {Error} err - The caught error object
 * @param {string} correlationId - Unique ID for tracing this request
 */
function logConnectionDiagnostics(err, correlationId) {
  const timestamp = new Date().toISOString();
  const code = err.code || 'UNKNOWN';
  const errno = err.errno || 'N/A';

  console.error('═══════════════════════════════════════════════════════════');
  console.error(`[PAYMENT ERROR] Correlation ID : ${correlationId}`);
  console.error(`[PAYMENT ERROR] Timestamp      : ${timestamp}`);
  console.error(`[PAYMENT ERROR] Error Code     : ${code}`);
  console.error(`[PAYMENT ERROR] Errno          : ${errno}`);
  console.error(`[PAYMENT ERROR] Message        : ${err.message}`);
  console.error(`[PAYMENT ERROR] SQL State      : ${err.sqlState || 'N/A'}`);
  console.error(`[PAYMENT ERROR] SQL Message    : ${err.sqlMessage || 'N/A'}`);

  // ── Specific connection failure diagnostics ──
  if (code === 'ECONNREFUSED') {
    console.error('[PAYMENT DIAG] ⛔ Connection REFUSED. Possible causes:');
    console.error('  1. Aiven MySQL IP whitelist is blocking this server\'s IP.');
    console.error('  2. DB_HOST or DB_PORT environment variable is incorrect.');
    console.error('  3. Aiven service is down or restarting.');
    console.error(`  → Current DB_HOST: ${process.env.DB_HOST || 'NOT SET'}`);
    console.error(`  → Current DB_PORT: ${process.env.DB_PORT || 'NOT SET'}`);
  }

  if (code === 'ETIMEDOUT' || code === 'ETIMEOUT' || code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('[PAYMENT DIAG] ⏱️ Connection TIMEOUT / LOST. Possible causes:');
    console.error('  1. Vercel serverless function cold start exceeded Aiven timeout.');
    console.error('  2. Network firewall between Vercel and Aiven is blocking traffic.');
    console.error('  3. Aiven connection pool exhausted (check connectionLimit).');
    console.error('  4. SSL handshake failed or took too long.');
  }

  if (code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('[PAYMENT DIAG] 🔐 Access DENIED. Possible causes:');
    console.error('  1. DB_USER or DB_PASSWORD environment variable is incorrect on Vercel.');
    console.error('  2. Aiven user permissions have changed.');
    console.error(`  → Current DB_USER: ${process.env.DB_USER || 'NOT SET'}`);
  }

  if (code === 'ER_DUP_ENTRY') {
    console.error('[PAYMENT DIAG] 🔁 Duplicate entry — this transaction_id was already submitted.');
  }

  if (err.message?.includes('SSL') || err.message?.includes('TLS') || err.message?.includes('certificate')) {
    console.error('[PAYMENT DIAG] 🔒 SSL/TLS Error. Possible causes:');
    console.error('  1. ca.pem certificate file is missing or corrupted on Vercel.');
    console.error('  2. Aiven SSL certificate has been rotated.');
  }

  console.error('[PAYMENT ERROR] Full Stack Trace:');
  console.error(err.stack);
  console.error('═══════════════════════════════════════════════════════════');
}

/**
 * POST /api/payments/escrow
 * Body: { orderId, paymentMethod, senderAccountNo, transactionId, senderBankName?, accountHolderName? }
 */
exports.processEscrowPayment = async (req, res, next) => {
  // Generate a unique correlation ID for this request (for log tracing)
  const correlationId = `PAY-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  try {
    const {
      orderId,
      paymentMethod,
      senderAccountNo,
      transactionId,
      senderBankName,
      accountHolderName,
    } = req.body;

    const userId = req.user.userId;

    // ── Input Validation ────────────────────────────────────────────────────
    if (!orderId || !paymentMethod || !senderAccountNo || !transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: orderId, paymentMethod, senderAccountNo, and transactionId are required.',
        correlationId,
      });
    }

    if (!VALID_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment method. Must be one of: ${VALID_METHODS.join(', ')}.`,
        correlationId,
      });
    }

    // Bank transfer specific validation
    if (paymentMethod === 'bank') {
      if (!senderBankName) {
        return res.status(400).json({
          success: false,
          message: 'Sender bank name is required for bank transfers.',
          correlationId,
        });
      }
      if (!VALID_BANKS.includes(senderBankName)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid bank name. Please select from the approved bank list.',
          correlationId,
        });
      }
    }

    // ── Verify Order Exists & Belongs to User ───────────────────────────────
    const [orders] = await pool.query(
      'SELECT OrderID, ClientID, ContributorID, Amount, OrderStatus, PaymentStatus FROM Orders WHERE OrderID = ?',
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
        correlationId,
      });
    }

    const order = orders[0];

    if (order.ClientID !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to make payment for this order.',
        correlationId,
      });
    }

    if (order.transaction_id) {
      return res.status(409).json({
        success: false,
        message: 'Payment has already been submitted for this order.',
        correlationId,
      });
    }

    // ── Update Order with Payment Details ───────────────────────────────────
    await pool.query(
      `UPDATE Orders
       SET payment_method    = ?,
           sender_account_no = ?,
           sender_bank_name  = ?,
           transaction_id    = ?,
           PaymentStatus     = 'In_Escrow'
       WHERE OrderID = ?`,
      [
        paymentMethod,
        senderAccountNo.trim(),
        paymentMethod === 'bank' ? senderBankName : null,
        transactionId.trim().toUpperCase(),
        orderId,
      ]
    );

    // ── Insert into Payments Table ──────────────────────────────────────────
    await pool.query(
      `INSERT INTO Payments (OrderID, TransactionID, Amount, PaymentMethod, Status)
       VALUES (?, ?, ?, ?, 'Pending')`,
      [
        orderId,
        transactionId.trim().toUpperCase(),
        order.Amount,
        paymentMethod,
      ]
    );

    // ── Notify Contributor ──────────────────────────────────────────────────
    await createNotification(
      order.ContributorID,
      'order',
      'Payment Received',
      `Escrow payment of ৳${Number(order.Amount).toLocaleString()} received for Order #${orderId}. Funds are held securely.`,
      orderId
    );

    console.log(`[PAYMENT OK] ${correlationId} | Order #${orderId} | ${paymentMethod} | TxID: ${transactionId} | Amount: ${order.Amount}`);

    return res.status(200).json({
      success: true,
      message: 'Payment submitted successfully. Funds are held in escrow.',
      correlationId,
      data: {
        orderId,
        paymentMethod,
        transactionId: transactionId.trim().toUpperCase(),
        amount: order.Amount,
        paymentStatus: 'In_Escrow',
      },
    });

  } catch (err) {
    // ── Enterprise-grade connection error diagnostics ────────────────────────
    logConnectionDiagnostics(err, correlationId);

    // Duplicate transaction_id — user-friendly message
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'This Transaction ID has already been used. Please provide a unique TxID.',
        correlationId,
      });
    }

    // Connection / timeout errors — inform frontend without leaking internals
    if (['ECONNREFUSED', 'ETIMEDOUT', 'ETIMEOUT', 'PROTOCOL_CONNECTION_LOST'].includes(err.code)) {
      return res.status(503).json({
        success: false,
        message: 'Payment service is temporarily unavailable. Please try again shortly.',
        correlationId,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while processing your payment.',
      correlationId,
    });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// ── ESCROW RELEASE — Client confirms delivery, full payout ──────────────────
// ═════════════════════════════════════════════════════════════════════════════

exports.releaseEscrow = async (req, res, next) => {
  const conn = await pool.getConnection();
  const correlationId = `REL-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  try {
    const { orderId } = req.body;
    const userId = req.user.userId;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required.', correlationId });
    }

    const [orders] = await conn.query(
      'SELECT * FROM Orders WHERE OrderID = ?', [orderId]
    );
    if (orders.length === 0) {
      conn.release();
      return res.status(404).json({ success: false, message: 'Order not found.', correlationId });
    }
    const order = orders[0];

    // Only the client can release escrow
    if (order.ClientID !== userId) {
      conn.release();
      return res.status(403).json({ success: false, message: 'Only the client can release escrow.', correlationId });
    }

    // Order must be in Delivered state
    if (order.OrderStatus !== 'Delivered') {
      conn.release();
      return res.status(400).json({ success: false, message: 'Escrow can only be released for delivered orders.', correlationId });
    }

    await conn.beginTransaction();

    // Release full payment
    await conn.query(
      `UPDATE Orders
       SET PaymentStatus = 'Released',
           OrderStatus   = 'Completed'
       WHERE OrderID = ?`,
      [orderId]
    );

    // Update payment record
    await conn.query(
      `UPDATE Payments SET Status = 'Completed' WHERE OrderID = ?`,
      [orderId]
    );

    // Award PVP points to contributor (15 points per completed order)
    await conn.query(
      'UPDATE Users SET PVP_Points = PVP_Points + 15 WHERE UserID = ?',
      [order.ContributorID]
    );

    await conn.commit();

    // Notify the contributor
    await createNotification(
      order.ContributorID,
      'order',
      'Payment Released! 🎉',
      `৳${Number(order.Amount).toLocaleString()} has been released to your account for Order #${orderId}. +15 PVP Points earned!`,
      orderId
    );

    console.log(`[ESCROW RELEASE] ${correlationId} | Order #${orderId} | ৳${order.Amount} → Contributor #${order.ContributorID}`);

    conn.release();
    return res.json({
      success: true,
      message: 'Escrow released. Payment sent to contributor.',
      correlationId,
      data: {
        orderId,
        amount: order.Amount,
        contributorId: order.ContributorID,
        paymentStatus: 'Released',
        orderStatus: 'Completed',
        pvpAwarded: 15,
      },
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    logConnectionDiagnostics(err, correlationId);
    return res.status(500).json({ success: false, message: 'Failed to release escrow.', correlationId });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// ── CANCEL WITH COMPENSATION — Smart Dispute Math ───────────────────────────
// For every revision attempt, 10% weight is added.
// If canceled after 2 revisions → 20% to Contributor, 80% refund to Client.
// ═════════════════════════════════════════════════════════════════════════════

exports.cancelWithCompensation = async (req, res, next) => {
  const conn = await pool.getConnection();
  const correlationId = `CXL-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  try {
    const { orderId, reason } = req.body;
    const userId = req.user.userId;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required.', correlationId });
    }

    const [orders] = await conn.query(
      'SELECT * FROM Orders WHERE OrderID = ?', [orderId]
    );
    if (orders.length === 0) {
      conn.release();
      return res.status(404).json({ success: false, message: 'Order not found.', correlationId });
    }
    const order = orders[0];

    // Only the client can cancel
    if (order.ClientID !== userId) {
      conn.release();
      return res.status(403).json({ success: false, message: 'Only the client can cancel an order.', correlationId });
    }

    // Cannot cancel already completed or cancelled orders
    if (['Completed', 'Cancelled'].includes(order.OrderStatus)) {
      conn.release();
      return res.status(400).json({ success: false, message: `Cannot cancel an order in "${order.OrderStatus}" state.`, correlationId });
    }

    await conn.beginTransaction();

    // ── THE MATH ────────────────────────────────────────────────────────────
    // compensationPercent = RevisionCount × 10, capped at 50%
    const revisionCount = order.RevisionCount || 0;
    const compensationPercent = Math.min(revisionCount * 10, 50);
    const totalAmount = Number(order.Amount);
    const contributorCompensation = Number((totalAmount * compensationPercent / 100).toFixed(2));
    const clientRefund = Number((totalAmount - contributorCompensation).toFixed(2));

    const paymentStatus = compensationPercent > 0 ? 'Partially_Refunded' : 'Refunded';

    // Update order
    await conn.query(
      `UPDATE Orders
       SET OrderStatus   = 'Cancelled',
           PaymentStatus = ?
       WHERE OrderID = ?`,
      [paymentStatus, orderId]
    );

    // Update payment record
    await conn.query(
      `UPDATE Payments SET Status = 'Refunded' WHERE OrderID = ?`,
      [orderId]
    );

    // Log the cancellation as a dispute record
    await conn.query(
      `INSERT INTO Disputes (OrderID, RaisedByUserID, Reason, Status, ResolutionDetails)
       VALUES (?, ?, ?, 'Resolved', ?)`,
      [
        orderId,
        userId,
        reason || 'Client-initiated cancellation',
        `Auto-resolved: ${compensationPercent}% (৳${contributorCompensation}) to contributor, ${100 - compensationPercent}% (৳${clientRefund}) refunded to client. Based on ${revisionCount} revision(s).`,
      ]
    );

    await conn.commit();

    // Notify both parties
    await createNotification(
      order.ContributorID,
      'dispute',
      'Order Cancelled — Compensation Applied',
      `Order #${orderId} was cancelled. You earned ৳${contributorCompensation.toLocaleString()} (${compensationPercent}%) compensation for ${revisionCount} revision(s).`,
      orderId
    );

    await createNotification(
      order.ClientID,
      'dispute',
      'Order Cancelled — Refund Processed',
      `Order #${orderId} cancelled. ৳${clientRefund.toLocaleString()} (${100 - compensationPercent}%) refunded. ৳${contributorCompensation.toLocaleString()} (${compensationPercent}%) goes to the contributor for work completed.`,
      orderId
    );

    console.log(`[CANCEL+COMP] ${correlationId} | Order #${orderId} | ${revisionCount} revisions | Contributor: ৳${contributorCompensation} (${compensationPercent}%) | Client refund: ৳${clientRefund}`);

    conn.release();
    return res.json({
      success: true,
      message: 'Order cancelled with compensation applied.',
      correlationId,
      data: {
        orderId,
        totalAmount,
        revisionCount,
        compensationPercent,
        contributorCompensation,
        clientRefund,
        paymentStatus,
        orderStatus: 'Cancelled',
      },
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    logConnectionDiagnostics(err, correlationId);
    return res.status(500).json({ success: false, message: 'Failed to cancel order.', correlationId });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// ── DISPUTE ORDER — Either party raises a formal dispute ────────────────────
// ═════════════════════════════════════════════════════════════════════════════

exports.disputeOrder = async (req, res, next) => {
  const correlationId = `DIS-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  try {
    const { orderId, reason } = req.body;
    const userId = req.user.userId;

    if (!orderId || !reason) {
      return res.status(400).json({ success: false, message: 'orderId and reason are required.', correlationId });
    }

    const [orders] = await pool.query('SELECT * FROM Orders WHERE OrderID = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.', correlationId });
    }
    const order = orders[0];

    // User must be a party in this order
    if (order.ClientID !== userId && order.ContributorID !== userId) {
      return res.status(403).json({ success: false, message: 'You must be a party in this order to raise a dispute.', correlationId });
    }

    // Check for existing open disputes
    const [existingDisputes] = await pool.query(
      'SELECT DisputeID FROM Disputes WHERE OrderID = ? AND Status IN ("Open", "Under_Review")',
      [orderId]
    );
    if (existingDisputes.length > 0) {
      return res.status(409).json({ success: false, message: 'A dispute is already open for this order.', correlationId });
    }

    // Create the dispute
    const [result] = await pool.query(
      `INSERT INTO Disputes (OrderID, RaisedByUserID, Reason, Status)
       VALUES (?, ?, ?, 'Open')`,
      [orderId, userId, reason]
    );

    // Update order status
    await pool.query(
      `UPDATE Orders SET OrderStatus = 'Disputed' WHERE OrderID = ?`,
      [orderId]
    );

    // Notify the other party
    const otherPartyId = userId === order.ClientID ? order.ContributorID : order.ClientID;
    const [[raiser]] = await pool.query('SELECT Name FROM Users WHERE UserID = ?', [userId]);

    await createNotification(
      otherPartyId,
      'dispute',
      'Dispute Raised',
      `${raiser?.Name || 'A user'} raised a dispute on Order #${orderId}. Reason: "${reason.substring(0, 100)}"`,
      orderId
    );

    // Also notify the raiser for confirmation
    await createNotification(
      userId,
      'dispute',
      'Dispute Filed Successfully',
      `Your dispute for Order #${orderId} has been filed and is under review.`,
      orderId
    );

    console.log(`[DISPUTE] ${correlationId} | Order #${orderId} | Raised by User #${userId}`);

    return res.status(201).json({
      success: true,
      message: 'Dispute filed successfully. Both parties have been notified.',
      correlationId,
      data: {
        disputeId: result.insertId,
        orderId,
        raisedBy: userId,
        status: 'Open',
      },
    });
  } catch (err) {
    logConnectionDiagnostics(err, correlationId);
    return res.status(500).json({ success: false, message: 'Failed to file dispute.', correlationId });
  }
};
