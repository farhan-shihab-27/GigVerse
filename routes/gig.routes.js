const router = require('express').Router();
const authenticate = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/gig.controller');

// ── Authenticated gig management ─────────────────────────────────────────────
router.post('/',       authenticate, ctrl.createGig);     // Create
router.get('/my',      authenticate, ctrl.getMyGigs);     // My gigs (must be before /:id)
router.put('/:id',     authenticate, ctrl.updateGig);     // Update own gig
router.delete('/:id',  authenticate, ctrl.deleteGig);     // Delete own gig

// ── Public gig routes ────────────────────────────────────────────────────────
router.get('/',              ctrl.getAllGigs);
router.get('/:id',           ctrl.getGig);
router.get('/user/:userId',  ctrl.getGigsByContributor);

module.exports = router;
