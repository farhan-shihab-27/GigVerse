const router = require('express').Router();
const authenticate = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/payment.controller');

// POST /api/payments/escrow — Process escrow payment (JWT-protected)
router.post('/escrow', authenticate, ctrl.processEscrowPayment);

module.exports = router;
