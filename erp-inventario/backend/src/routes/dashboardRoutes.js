const router = require('express').Router();
const c = require('../controllers/dashboardController');
const { h, validarIds } = require('./_helpers');

validarIds(router);
router.get('/', h(c.resumen));
router.get('/alertas', h(c.alertas));
router.post('/alertas/revisar-todas', h(c.marcarTodas));
router.post('/alertas/:id/revisar', h(c.marcarAlerta));

module.exports = router;
