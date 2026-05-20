const router = require('express').Router();
const authenticate = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/dashboard.controller');

router.get('/stats',     ctrl.getStats);                     // Public platform stats
router.get('/my-stats',  authenticate, ctrl.getMyStats);     // Per-user stats (protected)
router.get('/telemetry', authenticate, ctrl.getTelemetry);   // Executive dashboard telemetry (protected)

module.exports = router;
