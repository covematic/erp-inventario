const router = require('express').Router();
const c = require('../controllers/reporteController');
const { authorize } = require('../middleware/roles');
const { h } = require('./_helpers');

router.use(authorize('SUPERVISOR'));
router.get('/', h(c.catalogo));
router.get('/:id', h(c.generar));

module.exports = router;
