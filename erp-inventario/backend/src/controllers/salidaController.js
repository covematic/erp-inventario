const s = require('../services/salidaService');

exports.listar = async (req, res) => res.json(await s.listar(req.query));
exports.obtener = async (req, res) => res.json(await s.obtener(Number(req.params.id)));
exports.crear = async (req, res) => {
  const g = await s.crear(req.body, req.user);
  const msg = g.estado === 'DESPACHADA'
    ? `Guía ${g.numero} despachada. El stock fue descontado.`
    : `Guía ${g.numero} registrada como pendiente. El stock quedó reservado.`;
  res.status(201).json({ ...g, message: msg });
};
exports.despachar = async (req, res) => {
  await s.despachar(Number(req.params.id), req.user);
  res.json({ message: 'Guía despachada. El stock fue descontado.' });
};
exports.anular = async (req, res) => {
  await s.anular(Number(req.params.id), req.body.motivo, req.user);
  res.json({ message: 'Guía anulada. El stock no devuelto se reintegró al inventario.' });
};
