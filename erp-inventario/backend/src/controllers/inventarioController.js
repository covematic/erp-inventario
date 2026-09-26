const stock = require('../services/stockService');
const ajustes = require('../services/ajusteService');

exports.stock = async (req, res) => res.json(await stock.listarStock(req.query));
exports.kardex = async (req, res) => res.json(await stock.kardex(Number(req.params.productoId), req.query));
exports.movimientos = async (req, res) => res.json(await stock.movimientos(req.query));
exports.listarAjustes = async (req, res) => res.json(await ajustes.listar(req.query));
exports.crearAjuste = async (req, res) => {
  const a = await ajustes.crear(req.body, req.user);
  res.status(201).json({ ...a, message: `Ajuste ${a.numero} registrado` });
};
