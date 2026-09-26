require('dotenv').config();

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('Falta la variable JWT_SECRET en producción');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  console.error('Falta la variable DATABASE_URL en producción');
  process.exit(1);
}

module.exports = {
  port: Number(process.env.PORT) || 4000,
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/erp_inventario',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-cambiar',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
