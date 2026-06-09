// GigVerse — Order / Escrow Controller (Enhanced)
// Two-way order flow: Direct purchase + Custom offers
// 4-step milestone tracking with notification integration
const pool = require('../database/db');
const { createNotification } = require('./notification.controller');

//  Default milestone labels 
const DEFAULT_MILESTONES = [
  { step: 1, label: 'Design & Planning' },
  { step: 2, label: 'Draft & Development' },
  { step: 3, label: 'Review & Revisions' },
  { step: 4, label: 'Final Delivery' },
];

// Create Order (Direct Gig Purchase) 
// Order starts as "Pending_Acceptance" — contributor must accept it.
exports.createOrder = async (req, res, next) => {
  try {
    const { clientId, gigId } = req.body;
    if (!clientId || !gigId) {
      return res.status(400).json({ success: false, message: 'clientId and gigId are required.' });
    }

    const [gigs] = await pool.query('SELECT * FROM Gigs WHERE GigID = ?', [gigId]);
    if (gigs.length === 0) {
      return res.status(404).json({ success: false, message: 'Gig not found.' });
    }
    const gig = gigs[0];

    if (Number(clientId) === gig.ContributorID) {
      return res.status(400).json({ success: false, message: 'You cannot place an order on your own gig.' });
    }

    const [result] = await pool.query(
      `INSERT INTO Orders (ClientID, ContributorID, GigID, Amount, OrderStatus, PaymentStatus)
       VALUES (?, ?, ?, ?, 'Pending_Acceptance', 'Escrow_Held')`,
      [clientId, gig.ContributorID, gigId, gig.BasePrice]
    );

    const orderId = result.insertId;

    // Get client name for notification
    const [[client]] = await pool.query('SELECT Name FROM Users WHERE UserID = ?', [clientId]);

    // Notify the contributor
    await createNotification(
      gig.ContributorID,
      'order',
      'New Order Received!',
      `${client?.Name || 'A client'} placed an order for "${gig.Title}". Review and accept to start working.`,
      orderId
    );

    return res.status(201).json({
      success: true,
      message: 'Order created. Awaiting contributor acceptance.',
      data: {
        orderId,
        clientId: Number(clientId),
        contributorId: gig.ContributorID,
        gigId: Number(gigId),
        amount: gig.BasePrice,
        orderStatus: 'Pending_Acceptance',
        paymentStatus: 'Escrow_Held',
      },
    });
  } catch (err) {
    next(err);
  }
};

// Accept Order (Contributor Only)
// Sets status to In_Progress, generates 4 milestones, starts countdown.
exports.acceptOrder = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const orderId = req.params.id;
    const userId  = req.user.userId;

    const [orders] = await conn.query(
      'SELECT * FROM Orders WHERE OrderID = ?', [orderId]
    );
    if (orders.length === 0) {
      conn.release();
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const order = orders[0];

    if (order.ContributorID !== userId) {
      conn.release();
      return res.status(403).json({ success: false, message: 'Only the contributor can accept this order.' });
    }

    // Handle idempotency: if already In_Progress, return success to unlock the frontend UI
    if (order.OrderStatus === 'In_Progress') {
      conn.release();
      return res.json({
        success: true,
        message: 'Order is already accepted and in progress.',
        data: { orderId: Number(orderId), orderStatus: 'In_Progress', deliveryDeadline: order.DeliveryDeadline || new Date().toISOString() },
      });
    }

    // Defensive state validation allowing multiple variants of Pending
    const validStates = ['Pending', 'Pending_Acceptance', 'Pending Acceptance', 'Custom_Pending'];
    if (!validStates.includes(order.OrderStatus)) {
      conn.release();
      return res.status(400).json({ success: false, message: `Order cannot be accepted in "${order.OrderStatus}" state.` });
    }

    await conn.beginTransaction();

    // Set status to In_Progress with acceptance timestamp
    // Default delivery deadline: 7 days from now
    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await conn.query(
      `UPDATE Orders
       SET OrderStatus      = 'In_Progress',
           AcceptedAt       = NOW(),
           DeliveryDeadline = ?,
           CurrentStep      = 1
       WHERE OrderID = ?`,
      [deadline, orderId]
    );

    // Generate 4 default milestones with escrow splits
    const perMilestone = Number((order.Amount * 0.25).toFixed(2));
    const milestoneValues = DEFAULT_MILESTONES.map(m => [orderId, m.step, m.label, 25, perMilestone, 'pending']);
    await conn.query(
      'INSERT INTO OrderMilestones (OrderID, Step, Label, AmountPercent, AmountTaka, Status) VALUES ?',
      [milestoneValues]
    );

    await conn.commit();

    // Notify the client
    const [[gig]] = await conn.query('SELECT Title FROM Gigs WHERE GigID = ?', [order.GigID]);
    await createNotification(
      order.ClientID,
      'order',
      'Order Accepted!',
      `Your order for "${gig?.Title || 'a gig'}" has been accepted. Work has begun!`,
      Number(orderId)
    );

    conn.release();
    return res.json({
      success: true,
      message: 'Order accepted. Delivery countdown started.',
      data: { orderId: Number(orderId), orderStatus: 'In_Progress', deliveryDeadline: deadline.toISOString() },
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    next(err);
  }
};

// Submit Milestone (Contributor marks a step as done)
exports.updateMilestone = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const userId  = req.user.userId;
    const { step } = req.body;

    if (!step || step < 1 || step > 4) {
      return res.status(400).json({ success: false, message: 'Step must be between 1 and 4.' });
    }

    const [orders] = await pool.query('SELECT * FROM Orders WHERE OrderID = ?', [orderId]);
    if (orders.length === 0) return res.status(404).json({ success: false, message: 'Order not found.' });
    const order = orders[0];

    if (order.ContributorID !== userId) {
      return res.status(403).json({ success: false, message: 'Only the contributor can update milestones.' });
    }
    if (order.OrderStatus !== 'In_Progress') {
      return res.status(400).json({ success: false, message: 'Milestones can only be updated for in-progress orders.' });
    }

    // Mark milestone as submitted + completed timestamp
    await pool.query(
      `UPDATE OrderMilestones
       SET CompletedAt = IFNULL(CompletedAt, NOW()),
           Status      = 'submitted_by_freelancer'
       WHERE OrderID = ? AND Step = ? AND Status = 'pending'`,
      [orderId, step]
    );

    // Update current step on the order
    await pool.query('UPDATE Orders SET CurrentStep = ?, CurrentMilestone = ? WHERE OrderID = ?', [step, step, orderId]);

    const milestoneLabel = DEFAULT_MILESTONES.find(m => m.step === step)?.label || `Step ${step}`;
    const percentage = step * 25;

    await createNotification(
      order.ClientID, 'milestone', `${percentage}% — Review Required`,
      `"${milestoneLabel}" submitted for your approval on Order #${orderId}. Review and release ${percentage}% escrow.`,
      Number(orderId)
    );

    return res.json({
      success: true,
      message: `Milestone ${step} (${milestoneLabel}) submitted — awaiting client approval.`,
      data: { orderId: Number(orderId), currentStep: step, percentage },
    });
  } catch (err) { next(err); }
};

// Approve Milestone & Release Escrow (Client)
exports.approveMilestone = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const orderId = req.params.id;
    const userId  = req.user.userId;
    const { step, rating, feedback } = req.body;

    if (!step || step < 1 || step > 4) {
      conn.release();
      return res.status(400).json({ success: false, message: 'Step must be between 1 and 4.' });
    }

    const [orders] = await conn.query('SELECT * FROM Orders WHERE OrderID = ?', [orderId]);
    if (orders.length === 0) { conn.release(); return res.status(404).json({ success: false, message: 'Order not found.' }); }
    const order = orders[0];

    if (order.ClientID !== userId) { conn.release(); return res.status(403).json({ success: false, message: 'Only the client can approve milestones.' }); }

    // Fetch the specific milestone
    const [milestones] = await conn.query(
      'SELECT * FROM OrderMilestones WHERE OrderID = ? AND Step = ?', [orderId, step]
    );
    if (milestones.length === 0) { conn.release(); return res.status(404).json({ success: false, message: 'Milestone not found.' }); }
    const ms = milestones[0];

    if (ms.Status !== 'submitted_by_freelancer') {
      conn.release();
      return res.status(400).json({ success: false, message: `Milestone is "${ms.Status}", not submitted for approval.` });
    }

    await conn.beginTransaction();

    // Calculate release amount (25% of order total per milestone)
    const releasePercent = ms.AmountPercent || 25;
    const releaseTaka = Number((Number(order.Amount) * releasePercent / 100).toFixed(2));
    const txnId = `MS-${orderId}-S${step}-${Date.now()}`;

    // Update milestone status
    await conn.query(
      `UPDATE OrderMilestones
       SET Status = 'funds_released', ApprovedAt = NOW(), AmountTaka = ?, ReleasedTransactionId = ?
       WHERE OrderID = ? AND Step = ?`,
      [releaseTaka, txnId, orderId, step]
    );

    // Track total escrow released on the order
    const newEscrowReleased = Number(order.EscrowReleased || 0) + releaseTaka;
    await conn.query(
      'UPDATE Orders SET EscrowReleased = ?, CurrentMilestone = ? WHERE OrderID = ?',
      [newEscrowReleased, step, orderId]
    );

    // Award PVP points per milestone (4 per step) AND credit WalletBalance (simulated escrow release)
    await conn.query(
      'UPDATE Users SET PVP_Points = PVP_Points + 4, WalletBalance = WalletBalance + ? WHERE UserID = ?',
      [releaseTaka, order.ContributorID]
    );

    // Fetch updated wallet balance for response
    const [[contributor]] = await conn.query(
      'SELECT WalletBalance FROM Users WHERE UserID = ?',
      [order.ContributorID]
    );

    // If all 4 milestones are released, mark order as Completed
    const [allMs] = await conn.query(
      "SELECT COUNT(*) AS released FROM OrderMilestones WHERE OrderID = ? AND Status = 'funds_released'",
      [orderId]
    );
    if (allMs[0].released >= 4) {
      // Mandatory Rating & Feedback Gate
      if (!rating || !feedback || String(feedback).trim().length < 10) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({
          success: false,
          message: 'Rating (1-5) and feedback (min 10 characters) are required to complete the order.',
        });
      }
      const ratingInt = parseInt(rating, 10);
      if (ratingInt < 1 || ratingInt > 5) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
      }

      // Mark order completed
      await conn.query("UPDATE Orders SET OrderStatus = 'Completed', PaymentStatus = 'Released' WHERE OrderID = ?", [orderId]);
      await conn.query("UPDATE Payments SET Status = 'Completed' WHERE OrderID = ?", [orderId]);

      // Save Review
      await conn.query(
        'INSERT INTO Reviews (OrderID, ReviewerID, Rating, Comment) VALUES (?, ?, ?, ?)',
        [orderId, userId, ratingInt, feedback.trim()]
      );

      // PVP bonus for 5-star review
      if (ratingInt === 5) {
        await conn.query('UPDATE Users SET PVP_Points = PVP_Points + 10 WHERE UserID = ?', [order.ContributorID]);
      }

      // Recalculate contributor's average rating
      const [[avgRow]] = await conn.query(
        'SELECT AVG(r.Rating) AS avgRating FROM Reviews r JOIN Orders o ON r.OrderID = o.OrderID WHERE o.ContributorID = ?',
        [order.ContributorID]
      );
      await conn.query(
        'UPDATE Users SET AverageRating = ? WHERE UserID = ?',
        [Number(avgRow?.avgRating || 0).toFixed(2), order.ContributorID]
      );

      // Auto-Report Engine 
      await conn.query(
        'INSERT INTO Reports (reporter_id, reported_user_id, order_id, reason, is_auto_generated) VALUES (?, ?, ?, ?, 1)',
        [userId, order.ContributorID, orderId, feedback.trim()]
      );
    }

    // Send system chat message about the release
    const sysMsg = JSON.stringify({
      type: 'system',
      text: `Milestone ${step} Approved: ৳${releaseTaka.toLocaleString()} released from Escrow. (${releasePercent}% of ৳${Number(order.Amount).toLocaleString()})`,
    });
    await conn.query(
      'INSERT INTO Messages (SenderID, ReceiverID, Content) VALUES (?, ?, ?)',
      [order.ClientID, order.ContributorID, sysMsg]
    );

    await conn.commit();

    const milestoneLabel = DEFAULT_MILESTONES.find(m => m.step === step)?.label || `Step ${step}`;
    await createNotification(
      order.ContributorID, 'milestone', `Milestone ${step} Approved! 🎉`,
      `৳${releaseTaka.toLocaleString()} released for "${milestoneLabel}" on Order #${orderId}. +4 PVP!`,
      Number(orderId)
    );

    conn.release();
    return res.json({
      success: true,
      message: `Milestone ${step} approved. ৳${releaseTaka.toLocaleString()} released.`,
      data: { orderId: Number(orderId), step, releaseTaka, txnId, totalReleased: newEscrowReleased, walletBalance: Number(contributor?.WalletBalance || 0) },
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    next(err);
  }
};

// Deliver Order (Contributor marks as delivered) 
exports.deliverOrder = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const userId  = req.user.userId;

    const [orders] = await pool.query('SELECT * FROM Orders WHERE OrderID = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const order = orders[0];

    if (order.ContributorID !== userId) {
      return res.status(403).json({ success: false, message: 'Only the contributor can deliver this order.' });
    }

    if (order.OrderStatus !== 'In_Progress') {
      return res.status(400).json({ success: false, message: 'Only in-progress orders can be delivered.' });
    }

    // Set all milestones as completed and update order
    await pool.query(
      'UPDATE OrderMilestones SET CompletedAt = IFNULL(CompletedAt, NOW()) WHERE OrderID = ?',
      [orderId]
    );

    await pool.query(
      `UPDATE Orders SET OrderStatus = 'Delivered', CurrentStep = 4 WHERE OrderID = ?`,
      [orderId]
    );

    // Notify the client
    const [[gig]] = await pool.query('SELECT Title FROM Gigs WHERE GigID = ?', [order.GigID]);
    await createNotification(
      order.ClientID,
      'order',
      'Order Delivered!',
      `Your order for "${gig?.Title || 'a gig'}" has been delivered. Please review and release payment.`,
      Number(orderId)
    );

    return res.json({
      success: true,
      message: 'Order marked as delivered. Awaiting client review.',
      data: { orderId: Number(orderId), orderStatus: 'Delivered' },
    });
  } catch (err) {
    next(err);
  }
};

// Request Revision (Client)
exports.requestRevision = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const userId  = req.user.userId;
    const { reason } = req.body;

    const [orders] = await pool.query('SELECT * FROM Orders WHERE OrderID = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const order = orders[0];

    if (order.ClientID !== userId) {
      return res.status(403).json({ success: false, message: 'Only the client can request revisions.' });
    }

    if (order.OrderStatus !== 'Delivered' && order.OrderStatus !== 'In_Progress') {
      return res.status(400).json({ success: false, message: 'Revisions can only be requested for delivered or in-progress orders.' });
    }

    const newRevisionCount = (order.RevisionCount || 0) + 1;

    // Log the revision
    await pool.query(
      'INSERT INTO OrderRevisions (OrderID, RequestedBy, Reason) VALUES (?, ?, ?)',
      [orderId, userId, reason || null]
    );

    // Reset order to In_Progress at step 3 (Revisions phase)
    await pool.query(
      `UPDATE Orders
       SET OrderStatus   = 'In_Progress',
           CurrentStep   = 3,
           RevisionCount = ?
       WHERE OrderID = ?`,
      [newRevisionCount, orderId]
    );

    // Reset step 4 milestone
    await pool.query(
      'UPDATE OrderMilestones SET CompletedAt = NULL WHERE OrderID = ? AND Step = 4',
      [orderId]
    );

    // Notify the contributor
    const [[gig]] = await pool.query('SELECT Title FROM Gigs WHERE GigID = ?', [order.GigID]);
    await createNotification(
      order.ContributorID,
      'order',
      'Revision Requested',
      `Client requested revision #${newRevisionCount} on "${gig?.Title || 'your gig'}". ${reason ? `Reason: ${reason}` : 'No reason provided.'}`,
      Number(orderId)
    );

    return res.json({
      success: true,
      message: `Revision #${newRevisionCount} requested. Contributor has been notified.`,
      data: { orderId: Number(orderId), revisionCount: newRevisionCount, compensation: `${newRevisionCount * 10}%` },
    });
  } catch (err) {
    next(err);
  }
};

// Create Custom Offer (From Chat Context)
exports.createCustomOffer = async (req, res, next) => {
  try {
    const { contributorId, clientId, title, amount, description } = req.body;
    const userId = req.user.userId;

    if (!contributorId || !clientId || !title || !amount) {
      return res.status(400).json({ success: false, message: 'contributorId, clientId, title, and amount are required.' });
    }

    if (Number(contributorId) === Number(clientId)) {
      return res.status(400).json({ success: false, message: 'Cannot create an offer for yourself.' });
    }

    // Ensure the authenticated user is either the client or contributor
    if (userId !== Number(contributorId) && userId !== Number(clientId)) {
      return res.status(403).json({ success: false, message: 'You must be a party in this custom offer.' });
    }

    // Create a "virtual" gig for tracking (uses GigID = 0 convention or we create one)
    // For simplicity, we create a temporary gig entry
    const [gigResult] = await pool.query(
      `INSERT INTO Gigs (ContributorID, Title, Description, BasePrice) VALUES (?, ?, ?, ?)`,
      [contributorId, `[Custom] ${title}`, description || 'Custom work agreement', amount]
    );
    const gigId = gigResult.insertId;

    const [orderResult] = await pool.query(
      `INSERT INTO Orders (ClientID, ContributorID, GigID, Amount, OrderStatus, PaymentStatus)
       VALUES (?, ?, ?, ?, 'Custom_Pending', 'Pending')`,
      [clientId, contributorId, gigId, amount]
    );
    const orderId = orderResult.insertId;

    // Determine who to notify (the other party)
    const recipientId = userId === Number(contributorId) ? Number(clientId) : Number(contributorId);
    const [[sender]] = await pool.query('SELECT Name FROM Users WHERE UserID = ?', [userId]);

    await createNotification(
      recipientId,
      'order',
      'Custom Offer Received',
      `${sender?.Name || 'A user'} sent you a custom offer: "${title}" for ৳${Number(amount).toLocaleString()}. Review in your dashboard.`,
      orderId
    );

    return res.status(201).json({
      success: true,
      message: 'Custom offer created. Awaiting confirmation and payment.',
      data: { orderId, gigId, clientId: Number(clientId), contributorId: Number(contributorId), amount: Number(amount), orderStatus: 'Custom_Pending' },
    });
  } catch (err) {
    next(err);
  }
};

// Transfer Order (Contributor Referral)
exports.transferOrder = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.userId;
    const { recipientEmail } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({ success: false, message: 'Recipient email or ID is required.' });
    }

    const [orders] = await pool.query('SELECT * FROM Orders WHERE OrderID = ?', [orderId]);
    if (orders?.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const order = orders[0];

    if (order.ContributorID !== userId) {
      return res.status(403).json({ success: false, message: 'Only the current contributor can transfer this order.' });
    }

    // Find recipient by email or ID
    const [recipients] = await pool.query(
      'SELECT UserID, Name FROM Users WHERE PersonalEmail = ? OR UserID = ?', 
      [recipientEmail, recipientEmail]
    );
    if (recipients?.length === 0) {
      return res.status(404).json({ success: false, message: 'Recipient not found.' });
    }
    const recipient = recipients[0];

    if (recipient.UserID === userId) {
      return res.status(400).json({ success: false, message: 'You cannot transfer an order to yourself.' });
    }
    if (recipient.UserID === order.ClientID) {
      return res.status(400).json({ success: false, message: 'You cannot transfer an order to the client.' });
    }

    // Update contributor
    await pool.query('UPDATE Orders SET ContributorID = ? WHERE OrderID = ?', [recipient.UserID, orderId]);

    // Notify new contributor
    await createNotification(
      recipient.UserID,
      'order',
      'Order Transferred to You',
      `An order has been referred to you. Check your dashboard to begin work.`,
      Number(orderId)
    );

    // Notify client
    await createNotification(
      order.ClientID,
      'order',
      'Order Contributor Changed',
      `Your order's contributor has transferred the work to ${recipient.Name || 'another contributor'}.`,
      Number(orderId)
    );

    return res.json({
      success: true,
      message: 'Order transferred successfully.',
      data: { orderId: Number(orderId), newContributorId: recipient.UserID }
    });
  } catch (err) {
    next(err);
  }
};

// Get Single Order
exports.getOrder = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.*, g.Title AS GigTitle, g.Description AS GigDescription,
              cl.Name AS ClientName, co.Name AS ContributorName
       FROM Orders o
       JOIN Gigs g  ON o.GigID = g.GigID
       JOIN Users cl ON o.ClientID = cl.UserID
       JOIN Users co ON o.ContributorID = co.UserID
       WHERE o.OrderID = ?`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Fetch milestones for this order
    const [milestones] = await pool.query(
      'SELECT * FROM OrderMilestones WHERE OrderID = ? ORDER BY Step ASC',
      [req.params.id]
    );

    // Fetch revision history
    const [revisions] = await pool.query(
      `SELECT r.*, u.Name AS RequestedByName
       FROM OrderRevisions r
       JOIN Users u ON r.RequestedBy = u.UserID
       WHERE r.OrderID = ?
       ORDER BY r.CreatedAt DESC`,
      [req.params.id]
    );

    return res.json({
      success: true,
      data: { ...rows[0], milestones, revisions },
    });
  } catch (err) {
    next(err);
  }
};

// Update Order Status (Generic)
exports.updateOrderStatus = async (req, res, next) => {
  try {
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
    values.push(req.params.id);
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

// Get Orders by User ID
exports.getOrdersByUser = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.*, g.Title AS GigTitle FROM Orders o JOIN Gigs g ON o.GigID = g.GigID
       WHERE o.ClientID = ? OR o.ContributorID = ? ORDER BY o.CreatedAt DESC`,
      [req.params.userId, req.params.userId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// Get My Orders (Logged-in User)
exports.getMyOrders = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const [rows] = await pool.query(
      `SELECT o.*, g.Title AS GigTitle, g.Description AS GigDescription,
              cl.Name AS ClientName, co.Name AS ContributorName
       FROM Orders o
       JOIN Gigs g  ON o.GigID = g.GigID
       JOIN Users cl ON o.ClientID = cl.UserID
       JOIN Users co ON o.ContributorID = co.UserID
       WHERE o.ClientID = ? OR o.ContributorID = ?
       ORDER BY o.CreatedAt DESC`,
      [userId, userId]
    );

    // Fetch milestones for all returned orders in one query
    if (rows.length > 0) {
      const orderIds = rows.map(r => r.OrderID);
      const [milestones] = await pool.query(
        'SELECT * FROM OrderMilestones WHERE OrderID IN (?) ORDER BY Step ASC',
        [orderIds]
      );

      // Group milestones by OrderID
      const milestoneMap = {};
      milestones.forEach(m => {
        if (!milestoneMap[m.OrderID]) milestoneMap[m.OrderID] = [];
        milestoneMap[m.OrderID].push(m);
      });

      rows.forEach(r => {
        r.milestones = milestoneMap[r.OrderID] || [];
      });
    }

    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

//  Get Contributor Contact
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
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};
