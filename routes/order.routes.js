const router = require('express').Router();
const ctrl   = require('../controllers/order.controller');

router.post('/',              ctrl.createOrder);
router.get('/:id',            ctrl.getOrder);
router.patch('/:id/status',   ctrl.updateOrderStatus);
router.get('/user/:userId',   ctrl.getOrdersByUser);

module.exports = router;
