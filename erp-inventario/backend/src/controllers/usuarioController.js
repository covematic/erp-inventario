const s = require('../services/usuarioService');

exports.listar = async (req, res) => res.json(await s.listar());
exports.roles = async (req, res) => res.json(await s.roles());
exports.crear = async (req, res) => res.status(201).json(await s.crear(req.body));
exports.actualizar = async (req, res) => res.json(await s.actualizar(Number(req.params.id), req.body, req.user));
exports.basico = async (req, res) => res.json((await s.listar()).map((u) => ({ id: u.id, nombre: u.nombre })));
