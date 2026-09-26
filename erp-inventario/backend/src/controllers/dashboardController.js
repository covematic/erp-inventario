const dashboard = require('../services/dashboardService');
const alertas = require('../services/alertaService');

exports.resumen = async (req, res) => res.json(await dashboard.resumen());
exports.alertas = async (req, res) => res.json(await alertas.listar());
exports.marcarAlerta = async (req, res) => {
  await alertas.marcarLeida(Number(req.params.id));
  res.json({ message: 'Alerta marcada como revisada' });
};
exports.marcarTodas = async (req, res) => {
  await alertas.marcarTodasLeidas();
  res.json({ message: 'Alertas marcadas como revisadas' });
};
