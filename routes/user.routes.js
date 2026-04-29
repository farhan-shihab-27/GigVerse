const router = require('express').Router();
const ctrl   = require('../controllers/user.controller');

// Leaderboard (must come before /:id to avoid route collision)
router.get('/leaderboard', ctrl.getLeaderboard);

// Public profile
router.get('/:id',  ctrl.getProfile);
router.put('/:id',  ctrl.updateProfile);

// Skills management
router.post('/:id/skills', ctrl.setSkills);

// Private / sensitive info (strictly protected routes)
router.get('/:id/private', ctrl.getPrivateInfo);
router.put('/:id/private', ctrl.updatePrivateInfo);

module.exports = router;
