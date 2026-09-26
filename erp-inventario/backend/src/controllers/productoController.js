const s = require('../services/productoService');

exports.listar = async (req, res) => res.json(await s.listar(req.query));
exports.obtener = async (req, res) => res.json(await s.obtener(Number(req.params.id)));
exports.crear = async (req, res) => res.status(201).json(await s.crear(req.body));
exports.actualizar = async (req, res) => res.json(await s.actualizar(Number(req.params.id), req.body));
exports.cambiarEstado = async (req, res) => res.json(await s.cambiarEstado(Number(req.params.id), Boolean(req.body.activo)));
exports.eliminar = async (req, res) => res.json(await s.eliminar(Number(req.params.id)));
