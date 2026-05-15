// ── GigVerse — Gig Controller (Full CRUD) ───────────────────────────────────
// Secure: createGig uses JWT userId, not body. Edit/Delete scoped to owner only.
const pool = require('../database/db');

// ── Create Gig (Authenticated — uses req.user.userId) ───────────────────────
exports.createGig = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const contributorId = req.user.userId;
    const { title, description, basePrice, imageUrl, categoryId } = req.body;

    if (!title || basePrice === undefined) {
      conn.release();
      return res.status(400).json({ success: false, message: 'title and basePrice are required.' });
    }

    await conn.beginTransaction();

    const [result] = await conn.query(
      'INSERT INTO Gigs (ContributorID, Title, Description, BasePrice) VALUES (?, ?, ?, ?)',
      [contributorId, title, description || null, basePrice]
    );
    const gigId = result.insertId;

    // Auto-insert primary image if provided
    if (imageUrl) {
      await conn.query(
        'INSERT INTO Gig_Images (GigID, ImageUrl, IsPrimary) VALUES (?, ?, TRUE)',
        [gigId, imageUrl]
      );
    }

    await conn.commit();
    conn.release();

    return res.status(201).json({
      success: true,
      message: 'Gig created successfully.',
      data: { gigId, contributorId, title, basePrice: Number(basePrice), imageUrl: imageUrl || null },
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    next(err);
  }
};

// ── Update Gig (Owner Only) ─────────────────────────────────────────────────
exports.updateGig = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const gigId  = req.params.id;
    const userId = req.user.userId;
    const { title, description, basePrice, imageUrl } = req.body;

    // Verify ownership
    const [gigs] = await conn.query('SELECT * FROM Gigs WHERE GigID = ?', [gigId]);
    if (gigs.length === 0) {
      conn.release();
      return res.status(404).json({ success: false, message: 'Gig not found.' });
    }
    if (gigs[0].ContributorID !== userId) {
      conn.release();
      return res.status(403).json({ success: false, message: 'You can only edit your own gigs.' });
    }

    await conn.beginTransaction();

    // Build dynamic update
    const fields = [];
    const values = [];
    if (title !== undefined)       { fields.push('Title = ?');       values.push(title); }
    if (description !== undefined) { fields.push('Description = ?'); values.push(description); }
    if (basePrice !== undefined)   { fields.push('BasePrice = ?');   values.push(basePrice); }

    if (fields.length > 0) {
      values.push(gigId);
      await conn.query(`UPDATE Gigs SET ${fields.join(', ')} WHERE GigID = ?`, values);
    }

    // Update primary image if provided
    if (imageUrl !== undefined) {
      // Remove old primary images
      await conn.query('DELETE FROM Gig_Images WHERE GigID = ? AND IsPrimary = TRUE', [gigId]);
      if (imageUrl) {
        await conn.query(
          'INSERT INTO Gig_Images (GigID, ImageUrl, IsPrimary) VALUES (?, ?, TRUE)',
          [gigId, imageUrl]
        );
      }
    }

    await conn.commit();
    conn.release();

    return res.json({ success: true, message: 'Gig updated successfully.' });
  } catch (err) {
    await conn.rollback();
    conn.release();
    next(err);
  }
};

// ── Delete Gig (Owner Only — blocks if active orders exist) ─────────────────
exports.deleteGig = async (req, res, next) => {
  try {
    const gigId  = req.params.id;
    const userId = req.user.userId;

    // Verify ownership
    const [gigs] = await pool.query('SELECT * FROM Gigs WHERE GigID = ?', [gigId]);
    if (gigs.length === 0) {
      return res.status(404).json({ success: false, message: 'Gig not found.' });
    }
    if (gigs[0].ContributorID !== userId) {
      return res.status(403).json({ success: false, message: 'You can only delete your own gigs.' });
    }

    // Check for active orders linked to this gig
    const [[{ activeCount }]] = await pool.query(
      `SELECT COUNT(*) AS activeCount FROM Orders
       WHERE GigID = ? AND OrderStatus NOT IN ('Completed', 'Cancelled')`,
      [gigId]
    );
    if (activeCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete this gig — ${activeCount} active order(s) are linked to it.`,
      });
    }

    // Safe to delete (cascades to Gig_Images via FK)
    await pool.query('DELETE FROM Gigs WHERE GigID = ?', [gigId]);

    return res.json({ success: true, message: 'Gig deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// ── Get My Gigs (Authenticated — all gigs by logged-in user) ────────────────
exports.getMyGigs = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const [rows] = await pool.query(
      `SELECT g.GigID, g.Title, g.Description, g.BasePrice, g.CreatedAt,
              gi.ImageUrl AS PrimaryImage
       FROM Gigs g
       LEFT JOIN Gig_Images gi ON gi.GigID = g.GigID AND gi.IsPrimary = TRUE
       WHERE g.ContributorID = ?
       ORDER BY g.CreatedAt DESC`,
      [userId]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ── Get Single Gig ──────────────────────────────────────────────────────────
exports.getGig = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT g.*, u.Name AS ContributorName, u.UiuEmail, u.PersonalEmail, u.AverageRating, u.PVP_Points, p.WhatsAppNumber
       FROM Gigs g 
       JOIN Users u ON g.ContributorID = u.UserID 
       LEFT JOIN User_Private_Info p ON u.UserID = p.UserID
       WHERE g.GigID = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Gig not found.' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// ── Get Gigs by Contributor (Public) ────────────────────────────────────────
exports.getGigsByContributor = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Gigs WHERE ContributorID = ?', [req.params.userId]);
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ── Get All Gigs (Public Feed) ──────────────────────────────────────────────
exports.getAllGigs = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const [rows] = await pool.query(
      `SELECT g.GigID, g.Title, g.Description, g.BasePrice, g.CreatedAt,
              u.UserID  AS ContributorID,
              u.Name    AS ContributorName,
              u.ProfilePicUrl,
              u.PVP_Points,
              u.AverageRating,
              r.RoleName,
              d.DeptName,
              gi.ImageUrl AS PrimaryImage
       FROM Gigs g
       JOIN Users       u  ON g.ContributorID = u.UserID
       JOIN Roles       r  ON u.RoleID        = r.RoleID
       JOIN Departments d  ON u.DeptID        = d.DeptID
       LEFT JOIN Gig_Images gi ON gi.GigID = g.GigID AND gi.IsPrimary = TRUE
       ORDER BY g.CreatedAt DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};
