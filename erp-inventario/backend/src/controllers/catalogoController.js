const s = require('../services/catalogoService');

/** Genera los controladores para un catálogo concreto (categorias, proveedores, ...). */
module.exports = (tabla) => ({
  listar: async (req, res) => res.json(await s.listar(tabla, req.query)),
  crear: async (req, res) => res.status(201).json(await s.crear(tabla, req.body)),
  actualizar: async (req, res) => res.json(await s.actualizar(tabla, Number(req.params.id), req.body)),
  eliminar: async (req, res) => res.json(await s.eliminar(tabla, Number(req.params.id))),
});
