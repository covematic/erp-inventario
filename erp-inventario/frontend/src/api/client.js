import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('erp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes('/auth/login')) {
      localStorage.removeItem('erp_token');
      localStorage.removeItem('erp_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

/** Extrae un mensaje legible de un error de la API. */
export function errorMessage(err) {
  if (!err.response) return 'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.';
  return err.response.data?.message || 'Ocurrió un error inesperado';
}

/** Convierte los errores de validación del backend en { campo: mensaje }. */
export function fieldErrors(err) {
  const det = err.response?.data?.details;
  if (!Array.isArray(det)) return {};
  return Object.fromEntries(det.filter((d) => d.campo !== undefined).map((d) => [d.campo, d.mensaje]));
}

/** Descarga un archivo (CSV/Excel) respetando la autenticación. */
export async function download(url, params, filename) {
  const res = await api.get(url, { params, responseType: 'blob' });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

export default api;
