const router = require('express').Router();
const authenticate = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/payment.controller');

// POST /api/payments/escrow — Process escrow payment (JWT-protected)
router.post('/escrow',          authenticate, ctrl.processEscrowPayment);

// POST /api/payments/escrow/release — Client releases escrow to contributor
router.post('/escrow/release',  authenticate, ctrl.releaseEscrow);

// POST /api/payments/escrow/cancel — Client cancels with compensation math
router.post('/escrow/cancel',   authenticate, ctrl.cancelWithCompensation);

// POST /api/payments/escrow/dispute — Either party raises a dispute
router.post('/escrow/dispute',  authenticate, ctrl.disputeOrder);

module.exports = router;
