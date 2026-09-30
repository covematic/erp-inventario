const app = require('./app');
const { port } = require('./config/env');
const { pool } = require('./config/db');
const { initDbSiVacia, aplicarMigraciones } = require('./config/initDb');

pool.query('SELECT 1')
  .then(() => initDbSiVacia())
  .then(() => aplicarMigraciones())
  .then(() => {
    app.listen(port, () => console.log(`API del ERP de inventario escuchando en http://localhost:${port}/api`));
  })
  .catch((err) => {
    console.error('No se pudo iniciar: revise DATABASE_URL (conexión a PostgreSQL)');
    console.error(err.message);
    process.exit(1);
  });
