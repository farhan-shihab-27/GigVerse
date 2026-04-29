const router = require('express').Router();
const ctrl   = require('../controllers/gig.controller');

router.post('/',               ctrl.createGig);
router.get('/',                ctrl.getAllGigs);
router.get('/:id',             ctrl.getGig);
router.get('/user/:userId',    ctrl.getGigsByContributor);

module.exports = router;
