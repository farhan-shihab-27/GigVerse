// ── GigVerse — Message / Chat Controller ────────────────────────────────────
// Handles direct messaging between users + embedded proposal system.
// Proposals are stored as JSON in the Messages.Content column.
const pool = require('../database/db');
const { createNotification } = require('./notification.controller');

// ── Send a regular text message ─────────────────────────────────────────────
exports.sendMessage = async (req, res, next) => {
  try {
    const senderId   = req.user.userId;
    const { receiverId, content } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ success: false, message: 'receiverId and content are required.' });
    }
    if (Number(receiverId) === senderId) {
      return res.status(400).json({ success: false, message: 'Cannot send a message to yourself.' });
    }

    const [result] = await pool.query(
      'INSERT INTO Messages (SenderID, ReceiverID, Content) VALUES (?, ?, ?)',
      [senderId, receiverId, content]
    );

    // Notify receiver of new message
    const [[sender]] = await pool.query('SELECT Name FROM Users WHERE UserID = ?', [senderId]);
    await createNotification(
      Number(receiverId),
      'message',
      'New Message',
      `${sender?.Name || 'Someone'}: ${content.length > 60 ? content.slice(0, 60) + '…' : content}`,
      result.insertId
    );

    return res.status(201).json({
      success: true,
      data: {
        messageId: result.insertId,
        senderId,
        receiverId: Number(receiverId),
        content,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Get conversation between current user and another user ──────────────────
exports.getConversation = async (req, res, next) => {
  try {
    const userId    = req.user.userId;
    const partnerId = Number(req.params.userId);

    const [rows] = await pool.query(
      `SELECT m.MessageID, m.SenderID, m.ReceiverID, m.Content, m.IsRead, m.Timestamp
       FROM Messages m
       WHERE (m.SenderID = ? AND m.ReceiverID = ?)
          OR (m.SenderID = ? AND m.ReceiverID = ?)
       ORDER BY m.Timestamp ASC`,
      [userId, partnerId, partnerId, userId]
    );

    // Mark all incoming messages as read
    await pool.query(
      'UPDATE Messages SET IsRead = TRUE WHERE SenderID = ? AND ReceiverID = ? AND IsRead = FALSE',
      [partnerId, userId]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ── Get conversation list (unique partners with last message) ───────────────
exports.getConversationList = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const [rows] = await pool.query(
      `SELECT
         partner.UserID   AS PartnerId,
         partner.Name     AS PartnerName,
         partner.ProfilePicUrl AS PartnerAvatar,
         latestMsg.Content   AS LastMessage,
         latestMsg.Timestamp AS LastTimestamp,
         latestMsg.SenderID  AS LastSenderId,
         unread.UnreadCount
       FROM (
         SELECT
           CASE WHEN SenderID = ? THEN ReceiverID ELSE SenderID END AS PartnerID,
           MAX(MessageID) AS MaxMsgID
         FROM Messages
         WHERE SenderID = ? OR ReceiverID = ?
         GROUP BY PartnerID
       ) AS convos
       JOIN Messages latestMsg ON latestMsg.MessageID = convos.MaxMsgID
       JOIN Users partner ON partner.UserID = convos.PartnerID
       LEFT JOIN (
         SELECT SenderID, COUNT(*) AS UnreadCount
         FROM Messages
         WHERE ReceiverID = ? AND IsRead = FALSE
         GROUP BY SenderID
       ) unread ON unread.SenderID = convos.PartnerID
       ORDER BY latestMsg.Timestamp DESC`,
      [userId, userId, userId, userId]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ── Send a Proposal (Special message with JSON payload) ─────────────────────
exports.sendProposal = async (req, res, next) => {
  try {
    const senderId = req.user.userId;
    const { receiverId, price, deliveryDays, description } = req.body;

    if (!receiverId || !price || !deliveryDays || !description) {
      return res.status(400).json({
        success: false,
        message: 'receiverId, price, deliveryDays, and description are required.',
      });
    }
    if (Number(receiverId) === senderId) {
      return res.status(400).json({ success: false, message: 'Cannot send a proposal to yourself.' });
    }

    // Encode proposal as JSON in Content
    const payload = JSON.stringify({
      type: 'proposal',
      price: Number(price),
      deliveryDays: Number(deliveryDays),
      description,
      status: 'pending', // pending | accepted | declined
    });

    const [result] = await pool.query(
      'INSERT INTO Messages (SenderID, ReceiverID, Content) VALUES (?, ?, ?)',
      [senderId, receiverId, payload]
    );

    // Notify the receiver
    const [[sender]] = await pool.query('SELECT Name FROM Users WHERE UserID = ?', [senderId]);
    await createNotification(
      Number(receiverId),
      'message',
      'New Custom Proposal',
      `${sender?.Name || 'A contributor'} sent you a custom proposal for ৳${Number(price).toLocaleString()}. Check your messages to review.`,
      result.insertId
    );

    return res.status(201).json({
      success: true,
      message: 'Proposal sent successfully.',
      data: {
        messageId: result.insertId,
        senderId,
        receiverId: Number(receiverId),
        proposal: { price: Number(price), deliveryDays: Number(deliveryDays), description, status: 'pending' },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Accept Proposal → Create Gig + Order + Escrow ───────────────────────────
exports.acceptProposal = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const userId    = req.user.userId;
    const messageId = req.params.messageId;

    // 1. Fetch the proposal message
    const [msgs] = await conn.query('SELECT * FROM Messages WHERE MessageID = ?', [messageId]);
    if (msgs.length === 0) {
      conn.release();
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }
    const msg = msgs[0];

    // Only the receiver can accept
    if (msg.ReceiverID !== userId) {
      conn.release();
      return res.status(403).json({ success: false, message: 'Only the proposal recipient can accept it.' });
    }

    // Parse proposal
    let proposal;
    try { proposal = JSON.parse(msg.Content); } catch {
      conn.release();
      return res.status(400).json({ success: false, message: 'This message is not a valid proposal.' });
    }
    if (proposal.type !== 'proposal') {
      conn.release();
      return res.status(400).json({ success: false, message: 'This message is not a proposal.' });
    }
    if (proposal.status === 'accepted') {
      conn.release();
      return res.status(409).json({ success: false, message: 'This proposal has already been accepted.' });
    }

    await conn.beginTransaction();

    const contributorId = msg.SenderID;
    const clientId      = msg.ReceiverID;
    const amount        = proposal.price;
    const title         = proposal.description;

    // 2. Create a virtual gig for this custom deal
    const [gigResult] = await conn.query(
      'INSERT INTO Gigs (ContributorID, Title, Description, BasePrice) VALUES (?, ?, ?, ?)',
      [contributorId, `[Custom] ${title}`, `Custom proposal — delivery in ${proposal.deliveryDays} day(s)`, amount]
    );
    const gigId = gigResult.insertId;

    // 3. Create the order with Escrow
    const deadline = new Date(Date.now() + proposal.deliveryDays * 24 * 60 * 60 * 1000);
    const [orderResult] = await conn.query(
      `INSERT INTO Orders (ClientID, ContributorID, GigID, Amount, OrderStatus, PaymentStatus)
       VALUES (?, ?, ?, ?, 'Pending_Acceptance', 'Escrow_Held')`,
      [clientId, contributorId, gigId, amount]
    );
    const orderId = orderResult.insertId;

    // 4. Mark the proposal as accepted in the message content
    proposal.status  = 'accepted';
    proposal.orderId = orderId;
    await conn.query(
      'UPDATE Messages SET Content = ? WHERE MessageID = ?',
      [JSON.stringify(proposal), messageId]
    );

    // 5. Send a system message confirming the deal
    const confirmMsg = JSON.stringify({
      type: 'system',
      text: `Proposal accepted! Order #${orderId} created for ৳${Number(amount).toLocaleString()}. The contributor can now begin work.`,
    });
    await conn.query(
      'INSERT INTO Messages (SenderID, ReceiverID, Content) VALUES (?, ?, ?)',
      [clientId, contributorId, confirmMsg]
    );

    await conn.commit();

    // 6. Notify both parties
    const [[client]] = await conn.query('SELECT Name FROM Users WHERE UserID = ?', [clientId]);
    const [[contributor]] = await conn.query('SELECT Name FROM Users WHERE UserID = ?', [contributorId]);

    await createNotification(
      contributorId,
      'order',
      'Proposal Accepted!',
      `${client?.Name || 'A client'} accepted your proposal "${title}" for ৳${Number(amount).toLocaleString()}. Order #${orderId} created.`,
      orderId
    );
    await createNotification(
      clientId,
      'order',
      'Order Created from Proposal',
      `You accepted ${contributor?.Name || 'a contributor'}'s proposal. Order #${orderId} is ready. Payment held in escrow.`,
      orderId
    );

    conn.release();

    return res.status(201).json({
      success: true,
      message: 'Proposal accepted. Order created with escrow.',
      data: { orderId, gigId, clientId, contributorId, amount, deliveryDays: proposal.deliveryDays },
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    next(err);
  }
};

// ── Decline Proposal ────────────────────────────────────────────────────────
exports.declineProposal = async (req, res, next) => {
  try {
    const userId    = req.user.userId;
    const messageId = req.params.messageId;

    const [msgs] = await pool.query('SELECT * FROM Messages WHERE MessageID = ?', [messageId]);
    if (msgs.length === 0) return res.status(404).json({ success: false, message: 'Message not found.' });
    const msg = msgs[0];

    if (msg.ReceiverID !== userId) {
      return res.status(403).json({ success: false, message: 'Only the proposal recipient can decline it.' });
    }

    let proposal;
    try { proposal = JSON.parse(msg.Content); } catch {
      return res.status(400).json({ success: false, message: 'Not a valid proposal.' });
    }
    if (proposal.type !== 'proposal') return res.status(400).json({ success: false, message: 'Not a proposal.' });
    if (proposal.status !== 'pending') return res.status(409).json({ success: false, message: 'Proposal already responded to.' });

    proposal.status = 'declined';
    await pool.query('UPDATE Messages SET Content = ? WHERE MessageID = ?', [JSON.stringify(proposal), messageId]);

    // System message
    const declineMsg = JSON.stringify({
      type: 'system',
      text: `The proposal for ৳${Number(proposal.price).toLocaleString()} was declined. You can discuss and send a revised proposal.`,
    });
    await pool.query(
      'INSERT INTO Messages (SenderID, ReceiverID, Content) VALUES (?, ?, ?)',
      [userId, msg.SenderID, declineMsg]
    );

    // Notify the contributor
    const [[client]] = await pool.query('SELECT Name FROM Users WHERE UserID = ?', [userId]);
    await createNotification(
      msg.SenderID,
      'message',
      'Proposal Declined',
      `${client?.Name || 'A client'} declined your proposal for ৳${Number(proposal.price).toLocaleString()}. Consider sending a revised offer.`,
      messageId
    );

    return res.json({ success: true, message: 'Proposal declined.' });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/messages/unread-count — Total unread for badge ─────────────────
exports.getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const [[{ count }]] = await pool.query(
      'SELECT COUNT(*) AS count FROM Messages WHERE ReceiverID = ? AND IsRead = FALSE',
      [userId]
    );
    return res.json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
};
