import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Productos from './pages/Productos';
import Proyectos from './pages/Proyectos';
import Entradas from './pages/Entradas';
import Salidas from './pages/Salidas';
import SalidaForm from './pages/SalidaForm';
import Devoluciones from './pages/Devoluciones';
import Inventario from './pages/Inventario';
import Kardex from './pages/Kardex';
import Movimientos from './pages/Movimientos';
import Alertas from './pages/Alertas';
import Reportes from './pages/Reportes';
import Usuarios from './pages/Usuarios';
import Catalogos from './pages/Catalogos';

function Protected({ children, roles }) {
  const { user, can } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !can(...roles)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="alertas" element={<Alertas />} />
        <Route path="productos" element={<Productos />} />
        <Route path="proyectos" element={<Proyectos />} />
        <Route path="entradas" element={<Entradas />} />
        <Route path="salidas" element={<Salidas />} />
        <Route path="salidas/nueva" element={<Protected roles={['ALMACEN']}><SalidaForm /></Protected>} />
        <Route path="devoluciones" element={<Devoluciones />} />
        <Route path="inventario" element={<Inventario />} />
        <Route path="kardex" element={<Kardex />} />
        <Route path="kardex/:productoId" element={<Kardex />} />
        <Route path="movimientos" element={<Movimientos />} />
        <Route path="catalogos" element={<Catalogos />} />
        <Route path="reportes" element={<Protected roles={['SUPERVISOR']}><Reportes /></Protected>} />
        <Route path="usuarios" element={<Protected roles={[]}><Usuarios /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
