const router = require('express').Router();
const ctrl   = require('../controllers/search.controller');

router.get('/autocomplete',  ctrl.autocomplete);
router.get('/contributors',  ctrl.searchBySkill);
router.get('/skills',        ctrl.listSkills);

module.exports = router;

