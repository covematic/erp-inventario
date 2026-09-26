const router = require('express').Router();
const c = require('../controllers/proyectoController');
const { authorize } = require('../middleware/roles');
const { validate } = require('../middleware/validate');
const v = require('../validators');
const { h, validarIds } = require('./_helpers');

validarIds(router);
router.get('/', h(c.listar));
router.get('/:id', h(c.obtener));
router.post('/', authorize('SUPERVISOR'), validate(v.proyecto), h(c.crear));
router.put('/:id', authorize('SUPERVISOR'), validate(v.proyecto), h(c.actualizar));
router.delete('/:id', authorize('ADMIN'), h(c.eliminar));

module.exports = router;
