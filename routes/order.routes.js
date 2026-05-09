const router = require('express').Router();
const authenticate = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/order.controller');

// JWT-protected routes
router.get('/my', authenticate, ctrl.getMyOrders);
router.get('/contact/:userId', authenticate, ctrl.getContributorContact);

router.post('/', authenticate, ctrl.createOrder);
router.get('/:id', ctrl.getOrder);
router.patch('/:id/status', authenticate, ctrl.updateOrderStatus);
router.get('/user/:userId', ctrl.getOrdersByUser);

module.exports = router;
