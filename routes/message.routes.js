const router = require('express').Router();
const authenticate = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/message.controller');

// All message routes require authentication
router.post('/',                              authenticate, ctrl.sendMessage);
router.get('/conversations',                  authenticate, ctrl.getConversationList);
router.get('/unread-count',                   authenticate, ctrl.getUnreadCount);
router.get('/conversation/:userId',           authenticate, ctrl.getConversation);
router.post('/proposal',                      authenticate, ctrl.sendProposal);
router.post('/proposal/:messageId/accept',    authenticate, ctrl.acceptProposal);
router.post('/proposal/:messageId/decline',   authenticate, ctrl.declineProposal);

module.exports = router;
