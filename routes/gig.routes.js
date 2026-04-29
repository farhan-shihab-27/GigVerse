const router       = require('express').Router();
const authenticate = require('../middlewares/auth.middleware');
const ctrl         = require('../controllers/gig.controller');

router.post('/',               authenticate, ctrl.createGig);   // Protected
router.get('/',                ctrl.getAllGigs);
router.get('/:id',             ctrl.getGig);
router.get('/user/:userId',    ctrl.getGigsByContributor);

module.exports = router;
