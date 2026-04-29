const router = require('express').Router();
const ctrl   = require('../controllers/review.controller');

router.post('/',                ctrl.createReview);
router.get('/order/:orderId',   ctrl.getReviewByOrder);
router.get('/user/:userId',     ctrl.getReviewsByContributor);

module.exports = router;
