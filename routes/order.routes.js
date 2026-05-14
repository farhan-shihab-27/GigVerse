const router = require('express').Router();
const authenticate = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/order.controller');

// JWT-protected routes
router.get('/my', authenticate, ctrl.getMyOrders);
router.get('/contact/:userId', authenticate, ctrl.getContributorContact);

router.post('/',             authenticate, ctrl.createOrder);
router.post('/custom-offer', authenticate, ctrl.createCustomOffer);

router.get('/:id', ctrl.getOrder);

router.patch('/:id/status',    authenticate, ctrl.updateOrderStatus);
router.patch('/:id/accept',    authenticate, ctrl.acceptOrder);
router.patch('/:id/deliver',   authenticate, ctrl.deliverOrder);
router.patch('/:id/revision',  authenticate, ctrl.requestRevision);
router.patch('/:id/milestone', authenticate, ctrl.updateMilestone);

router.get('/user/:userId', ctrl.getOrdersByUser);

module.exports = router;
