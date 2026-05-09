const router = require('express').Router();
const authenticate = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/user.controller');

// Protected profile routes (JWT required)
router.get('/profile', authenticate, ctrl.getMyProfile);
router.put('/profile', authenticate, ctrl.updateMyProfile);
router.get('/profile/private', authenticate, ctrl.getMyPrivateInfo);
router.put('/profile/private', authenticate, ctrl.updateMyPrivateInfo);

// Leaderboard
router.get('/leaderboard', ctrl.getLeaderboard);

// Search by skill
router.get('/by-skill', ctrl.getUsersBySkill);

// Public profile
router.get('/public/:id', ctrl.getPublicProfile);

// Legacy Public profile
router.get('/:id', ctrl.getProfile);
router.put('/:id', ctrl.updateProfile);

// Skills management
router.post('/:id/skills', ctrl.setSkills);

// Private / sensitive info (strictly protected routes)
router.get('/:id/private', ctrl.getPrivateInfo);
router.put('/:id/private', ctrl.updatePrivateInfo);

module.exports = router;
