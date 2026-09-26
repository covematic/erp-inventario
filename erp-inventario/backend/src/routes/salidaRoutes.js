const router = require('express').Router();
const c = require('../controllers/salidaController');
const { authorize } = require('../middleware/roles');
const { validate } = require('../middleware/validate');
const v = require('../validators');
const { h, validarIds } = require('./_helpers');

validarIds(router);
router.get('/', h(c.listar));
router.get('/:id', h(c.obtener));
router.post('/', authorize('ALMACEN'), validate(v.salida), h(c.crear));
router.post('/:id/despachar', authorize('ALMACEN'), h(c.despachar));
// Una guía confirmada no se edita: se corrige anulándola (supervisor) o con una devolución
router.post('/:id/anular', authorize('SUPERVISOR'), validate(v.motivoAnulacion), h(c.anular));

module.exports = router;
