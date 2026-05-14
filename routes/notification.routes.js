const router = require('express').Router();
const authenticate = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/notification.controller');

// All notification routes are JWT-protected
router.get('/',             authenticate, ctrl.getNotifications);
router.get('/unread-count',  authenticate, ctrl.getUnreadCount);
router.patch('/read-all',    authenticate, ctrl.markAllAsRead);
router.patch('/:id/read',   authenticate, ctrl.markAsRead);

module.exports = router;
