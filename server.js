// ── GigVerse — Express Application Entry Point ──────────────
require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const authRoutes    = require('./routes/auth.routes');
const userRoutes    = require('./routes/user.routes');
const searchRoutes  = require('./routes/search.routes');
const orderRoutes   = require('./routes/order.routes');
const reviewRoutes  = require('./routes/review.routes');
const gigRoutes     = require('./routes/gig.routes');

const app = express();

// ── Global Middleware ───────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health Check ────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'GigVerse API', timestamp: new Date().toISOString() });
});

// ── API Routes ──────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/users',   userRoutes);
app.use('/api/search',  searchRoutes);
app.use('/api/orders',  orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/gigs',      gigRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ── Global Error Handler ────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ── Start Server ────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀  GigVerse API running on http://localhost:${PORT}`);
});

module.exports = app;
