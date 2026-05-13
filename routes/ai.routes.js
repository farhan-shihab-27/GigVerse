const router = require('express').Router();
const authenticate = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/ai.controller');

// POST /api/ai/estimate — AI-powered gig estimation (JWT-protected)
router.post('/estimate', authenticate, ctrl.estimateGig);

module.exports = router;
