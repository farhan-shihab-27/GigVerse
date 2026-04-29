// ── Gig Controller ──────────────────────────────────────────
const pool = require('../database/db');

exports.createGig = async (req, res, next) => {
  try {
    const { contributorId, title, description, basePrice } = req.body;
    if (!contributorId || !title || basePrice === undefined) {
      return res.status(400).json({ success: false, message: 'contributorId, title, and basePrice are required.' });
    }
    const [result] = await pool.query(
      'INSERT INTO Gigs (ContributorID, Title, Description, BasePrice) VALUES (?, ?, ?, ?)',
      [contributorId, title, description || null, basePrice]
    );
    return res.status(201).json({ success: true, data: { gigId: result.insertId } });
  } catch (err) { next(err); }
};

exports.getGig = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT g.*, u.Name AS ContributorName, u.UiuEmail, u.AverageRating, u.PVP_Points
       FROM Gigs g JOIN Users u ON g.ContributorID = u.UserID WHERE g.GigID = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Gig not found.' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

exports.getGigsByContributor = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Gigs WHERE ContributorID = ?', [req.params.userId]);
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.getAllGigs = async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT g.*, u.Name AS ContributorName, u.PVP_Points
       FROM Gigs g JOIN Users u ON g.ContributorID = u.UserID
       ORDER BY u.PVP_Points DESC`
    );
    return res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};
