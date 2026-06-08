// GigVerse — Express Application Entry Point
// Works both as a local dev server (app.listen) and as a Vercel Serverless Function (module.exports).
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const searchRoutes = require('./routes/search.routes');
const orderRoutes = require('./routes/order.routes');
const reviewRoutes = require('./routes/review.routes');
const gigRoutes = require('./routes/gig.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const aiRoutes = require('./routes/ai.routes');
const paymentRoutes = require('./routes/payment.routes');
const notificationRoutes = require('./routes/notification.routes');
const messageRoutes = require('./routes/message.routes');
const reportRoutes = require('./routes/report.routes');

const app = express();

// ── Global Middleware ─────────────────────────────────────────────────────────
// --- Global Middleware ---
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://gigverse-uiu.vercel.app'
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'GigVerse API', timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reports', reportRoutes);

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

// ── Global Process Crash Protectors ───────────────────────────────────────────
// Catch async DB pool drops, unhandled promise rejections, and any uncaught
// exceptions that would otherwise kill the process silently.
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});

// Vercel Serverless Functions require the Express app to be exported.
// This is also harmless for local dev (Node ignores unused exports).
module.exports = app;
