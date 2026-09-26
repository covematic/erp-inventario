const router = require('express').Router();
const c = require('../controllers/devolucionController');
const { authorize } = require('../middleware/roles');
const { validate } = require('../middleware/validate');
const v = require('../validators');
const { h, validarIds } = require('./_helpers');

validarIds(router);
router.get('/', h(c.listar));
router.get('/:id', h(c.obtener));
router.post('/', authorize('ALMACEN'), validate(v.devolucion), h(c.crear));

module.exports = router;
