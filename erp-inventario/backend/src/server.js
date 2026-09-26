const app = require('./app');
const { port } = require('./config/env');
const { pool } = require('./config/db');

pool.query('SELECT 1')
  .then(() => {
    app.listen(port, () => console.log(`API del ERP de inventario escuchando en http://localhost:${port}/api`));
  })
  .catch((err) => {
    console.error('No se pudo conectar a PostgreSQL. Revise DATABASE_URL en backend/.env');
    console.error(err.message);
    process.exit(1);
  });
