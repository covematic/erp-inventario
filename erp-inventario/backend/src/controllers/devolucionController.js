const s = require('../services/devolucionService');

exports.listar = async (req, res) => res.json(await s.listar(req.query));
exports.obtener = async (req, res) => res.json(await s.obtener(Number(req.params.id)));
exports.crear = async (req, res) => {
  const d = await s.crear(req.body, req.user);
  res.status(201).json({ ...d, message: `Devolución ${d.numero} registrada. El inventario fue actualizado.` });
};
