const router       = require('express').Router();
const authenticate = require('../middlewares/auth.middleware');
const ctrl         = require('../controllers/order.controller');

router.post('/',              authenticate, ctrl.createOrder);       // Protected
router.get('/:id',            ctrl.getOrder);
router.patch('/:id/status',   authenticate, ctrl.updateOrderStatus); // Protected
router.get('/user/:userId',   ctrl.getOrdersByUser);

module.exports = router;
