const router = require('express').Router();
const c = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const v = require('../validators');
const { h } = require('./_helpers');

router.post('/login', validate(v.login), h(c.login));
router.get('/me', authenticate, h(c.me));

module.exports = router;
