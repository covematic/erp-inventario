import { useCallback, useEffect, useRef, useState } from 'react';
import api, { errorMessage } from '../api/client';

/**
 * Carga datos de la API y recarga cuando cambian los parámetros.
 * Devuelve { data, loading, error, reload }.
 */
export default function useFetch(url, params, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const key = JSON.stringify(params || {});
  const reqId = useRef(0);

  const load = useCallback(async () => {
    if (!enabled || !url) return;
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(url, { params: JSON.parse(key) });
      if (id === reqId.current) setData(res.data);
    } catch (err) {
      if (id === reqId.current) setError(errorMessage(err));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [url, key, enabled]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load, setData };
}

/** Retrasa un valor (para búsquedas mientras se escribe). */
export function useDebounce(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
