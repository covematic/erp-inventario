const router = require('express').Router();
const c = require('../controllers/productoController');
const { authorize } = require('../middleware/roles');
const { validate } = require('../middleware/validate');
const v = require('../validators');
const { h, validarIds } = require('./_helpers');

validarIds(router);
router.get('/', h(c.listar));
router.get('/:id', h(c.obtener));
router.post('/', authorize('ADMIN'), validate(v.producto), h(c.crear));
router.put('/:id', authorize('ADMIN'), validate(v.producto), h(c.actualizar));
router.patch('/:id/estado', authorize('ADMIN'), h(c.cambiarEstado));
router.delete('/:id', authorize('ADMIN'), h(c.eliminar));

module.exports = router;
