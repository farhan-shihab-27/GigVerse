const router = require('express').Router();
const ctrl   = require('../controllers/auth.controller');

router.post('/register', ctrl.register);
router.post('/login',    ctrl.login);
router.post('/request-otp', ctrl.requestOtp);
router.post('/verify-otp', ctrl.verifyOtp);

module.exports = router;
