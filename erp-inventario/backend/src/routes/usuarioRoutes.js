const router = require('express').Router();
const c = require('../controllers/usuarioController');
const { authorize } = require('../middleware/roles');
const { validate } = require('../middleware/validate');
const v = require('../validators');
const { h, validarIds } = require('./_helpers');

validarIds(router);
// Lista reducida (id, nombre) para filtros; disponible para todos los roles
router.get('/basico', h(c.basico));
router.use(authorize('ADMIN'));
router.get('/', h(c.listar));
router.get('/roles', h(c.roles));
router.post('/', validate(v.usuario), h(c.crear));
router.put('/:id', validate(v.usuario), h(c.actualizar));

module.exports = router;
