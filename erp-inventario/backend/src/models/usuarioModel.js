const { query } = require('../config/db');

const SELECT = `SELECT u.id, u.nombre, u.email, u.activo, u.rol_id, r.nombre AS rol, u.created_at
                  FROM usuarios u JOIN roles r ON r.id = u.rol_id`;

const list = async () => (await query(`${SELECT} ORDER BY u.nombre`)).rows;
const findById = async (id) => (await query(`${SELECT} WHERE u.id = $1`, [id])).rows[0];

async function findByEmailConHash(email) {
  const { rows } = await query(
    `SELECT u.*, r.nombre AS rol FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.email = $1`,
    [email]
  );
  return rows[0];
}

async function create(u) {
  const { rows } = await query(
    `INSERT INTO usuarios (nombre, email, password_hash, rol_id, activo) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [u.nombre, u.email, u.password_hash, u.rol_id, u.activo]
  );
  return rows[0].id;
}

async function update(id, u) {
  const campos = ['nombre', 'email', 'password_hash', 'rol_id', 'activo'].filter((k) => u[k] !== undefined);
  const { rowCount } = await query(
    `UPDATE usuarios SET ${campos.map((k, i) => `${k} = $${i + 2}`).join(', ')}, updated_at = NOW() WHERE id = $1`,
    [id, ...campos.map((k) => u[k])]
  );
  return rowCount;
}

const roles = async () => (await query('SELECT * FROM roles ORDER BY id')).rows;

module.exports = { list, findById, findByEmailConHash, create, update, roles };
