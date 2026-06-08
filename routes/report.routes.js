const router = require('express').Router();
const authenticate = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/report.controller');

// JWT-protected routes
router.post('/', authenticate, ctrl.submitReport);

module.exports = router;
