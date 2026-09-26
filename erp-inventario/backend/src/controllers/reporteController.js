const s = require('../services/reporteService');

exports.catalogo = async (req, res) => res.json(s.catalogo());

exports.generar = async (req, res) => {
  const { desde, hasta, formato } = req.query;
  const rep = await s.generar(req.params.id, { desde, hasta });
  const nombre = `${req.params.id}_${new Date().toISOString().slice(0, 10)}`;

  if (formato === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}.csv"`);
    return res.send(s.toCSV(rep));
  }
  if (formato === 'xlsx') {
    const buf = await s.toXLSX(rep);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}.xlsx"`);
    return res.send(Buffer.from(buf));
  }
  res.json(rep);
};
