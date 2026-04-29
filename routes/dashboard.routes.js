const router = require('express').Router();
const ctrl   = require('../controllers/dashboard.controller');

router.get('/stats', ctrl.getStats);

module.exports = router;
