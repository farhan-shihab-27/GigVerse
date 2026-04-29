const router       = require('express').Router();
const authenticate = require('../middlewares/auth.middleware');
const ctrl         = require('../controllers/review.controller');

router.post('/',                authenticate, ctrl.createReview);  // Protected
router.get('/order/:orderId',   ctrl.getReviewByOrder);
router.get('/user/:userId',     ctrl.getReviewsByContributor);

module.exports = router;
