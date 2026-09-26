import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

function leerUsuario() {
  try {
    return JSON.parse(localStorage.getItem('erp_user'));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(leerUsuario);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('erp_token', data.token);
    localStorage.setItem('erp_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    setUser(null);
  }, []);

  /** true si el usuario tiene alguno de los roles (ADMIN siempre puede). */
  const can = useCallback(
    (...roles) => !!user && (user.rol === 'ADMIN' || roles.includes(user.rol)),
    [user]
  );

  return <AuthContext.Provider value={{ user, login, logout, can }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
