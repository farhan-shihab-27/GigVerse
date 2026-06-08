const router       = require('express').Router();
const authenticate = require('../middlewares/auth.middleware');
const ctrl         = require('../controllers/review.controller');

// ── Legacy: client-only review (kept for backward compatibility) ───────────────
router.post('/',                          authenticate, ctrl.createReview);

// ── Mutual Feedback: both client AND contributor can review each other ─────────
router.post('/mutual',                    authenticate, ctrl.submitMutualFeedback);

// ── GET: All reviews for an order (returns up to 2 — one per party) ────────────
router.get('/order/:orderId',             ctrl.getReviewByOrder);

// ── GET: Whether a specific user has already reviewed this order ───────────────
router.get('/order/:orderId/reviewer/:reviewerId', ctrl.getMyReviewForOrder);

// ── GET: All reviews received by a user (as reviewee) ─────────────────────────
router.get('/user/:userId',               ctrl.getReviewsByContributor);

module.exports = router;
