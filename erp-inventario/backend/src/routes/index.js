const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const catalogos = require('./catalogoRoutes');

router.get('/health', (req, res) => res.json({ ok: true }));
router.use('/auth', require('./authRoutes'));

// Todo lo siguiente requiere sesión
router.use(authenticate);
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/productos', require('./productoRoutes'));
router.use('/categorias', catalogos.categorias);
router.use('/proveedores', catalogos.proveedores);
router.use('/almacenes', catalogos.almacenes);
router.use('/areas', catalogos.areas);
router.use('/proyectos', require('./proyectoRoutes'));
router.use('/entradas', require('./entradaRoutes'));
router.use('/salidas', require('./salidaRoutes'));
router.use('/devoluciones', require('./devolucionRoutes'));
router.use('/inventario', require('./inventarioRoutes'));
router.use('/reportes', require('./reporteRoutes'));
router.use('/usuarios', require('./usuarioRoutes'));

module.exports = router;
