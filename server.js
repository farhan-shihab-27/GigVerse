// GigVerse — Express Application Entry Point
// Works both as a local dev server (app.listen) and as a Vercel Serverless Function (module.exports).
require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const authRoutes      = require('./routes/auth.routes');
const userRoutes      = require('./routes/user.routes');
const searchRoutes    = require('./routes/search.routes');
const orderRoutes     = require('./routes/order.routes');
const reviewRoutes    = require('./routes/review.routes');
const gigRoutes       = require('./routes/gig.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

// ── Global Middleware ─────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'GigVerse API', timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/search',    searchRoutes);
app.use('/api/orders',    orderRoutes);
app.use('/api/reviews',   reviewRoutes);
app.use('/api/gigs',      gigRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ── Conditional Start ─────────────────────────────────────────────────────────
// On Vercel, the VERCEL env var is set automatically.
// When present, we skip app.listen() — Vercel invokes the exported app directly.
// Locally, we start the Express HTTP server as usual.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`GigVerse API running on http://localhost:${PORT}`);
  });
}

// Vercel Serverless Functions require the Express app to be exported.
// This is also harmless for local dev (Node ignores unused exports).
module.exports = app;
