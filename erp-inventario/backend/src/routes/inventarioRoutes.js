const router = require('express').Router();
const c = require('../controllers/inventarioController');
const { authorize } = require('../middleware/roles');
const { validate } = require('../middleware/validate');
const v = require('../validators');
const { h, validarIds } = require('./_helpers');

validarIds(router);
router.get('/stock', h(c.stock));
router.get('/kardex/:productoId', h(c.kardex));
router.get('/movimientos', authorize('ALMACEN', 'SUPERVISOR'), h(c.movimientos));
router.get('/ajustes', h(c.listarAjustes));
router.post('/ajustes', authorize('SUPERVISOR'), validate(v.ajuste), h(c.crearAjuste));

module.exports = router;
