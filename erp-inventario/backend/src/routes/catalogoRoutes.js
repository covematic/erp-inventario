const express = require('express');
const makeController = require('../controllers/catalogoController');
const { authorize } = require('../middleware/roles');
const { validate } = require('../middleware/validate');
const v = require('../validators');
const { h, validarIds } = require('./_helpers');

/** Crea un router CRUD para un catálogo. Lectura: todos; escritura: ADMIN. */
function catalogoRouter(tabla, schema) {
  const router = validarIds(express.Router());
  const c = makeController(tabla);
  router.get('/', h(c.listar));
  router.post('/', authorize('ADMIN'), validate(schema), h(c.crear));
  router.put('/:id', authorize('ADMIN'), validate(schema), h(c.actualizar));
  router.delete('/:id', authorize('ADMIN'), h(c.eliminar));
  return router;
}

module.exports = {
  categorias: catalogoRouter('categorias', v.categoria),
  proveedores: catalogoRouter('proveedores', v.proveedor),
  almacenes: catalogoRouter('almacenes', v.almacen),
  areas: catalogoRouter('areas', v.area),
};
