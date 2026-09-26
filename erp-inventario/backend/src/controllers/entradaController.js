const s = require('../services/entradaService');

exports.listar = async (req, res) => res.json(await s.listar(req.query));
exports.obtener = async (req, res) => res.json(await s.obtener(Number(req.params.id)));
exports.crear = async (req, res) => {
  const e = await s.crear(req.body, req.user);
  res.status(201).json({ ...e, message: `Entrada ${e.numero} registrada. El stock fue actualizado.` });
};
exports.anular = async (req, res) => {
  await s.anular(Number(req.params.id), req.body.motivo, req.user);
  res.json({ message: 'Entrada anulada y stock revertido' });
};
