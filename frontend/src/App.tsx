import { useState, useEffect, type FC, type ReactNode } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
  Navigate,
} from 'react-router-dom';
import { BookingFlow } from './components/booking/BookingFlow.js';
import { MyAppointments } from './components/appointments/MyAppointments.js';
import { AdminLogin } from './components/admin/AdminLogin.js';
import { AdminDashboard } from './components/admin/AdminDashboard.js';
import type { AdminUser } from './types/index.js';
import { Scissors, Calendar, UserCheck, ShieldCheck } from 'lucide-react';

/**
 * Layout Público exclusivo para los clientes finales.
 * NO muestra enlaces, botones ni accesos al Backoffice administrativo.
 */
const PublicLayout: FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-red-600 selection:text-white font-sans">
      {/* Barra de Navegación Pública */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md sticky top-0 z-40 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo BarberRed */}
          <Link to="/" className="flex items-center gap-3 cursor-pointer group">
            <div className="w-10 h-10 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center shadow-lg shadow-red-600/20 group-hover:scale-105 transition-transform">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white">
                Barber<span className="text-red-500">Red</span>
              </span>
              <span className="ml-2 text-[10px] font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                MVP SDD
              </span>
            </div>
          </Link>

          {/* Menú de Clientes: Únicamente Agendar y Mis Citas */}
          <nav className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
            <Link
              to="/"
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                location.pathname === '/'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Agendar Hora</span>
            </Link>

            <Link
              to="/mis-citas"
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                location.pathname.startsWith('/mis-citas')
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Mis Citas</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Pie de Página */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-500 space-y-2">
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <ShieldCheck className="w-4 h-4 text-red-500" />
          <span>BarberRed Platform &bull; Horarios exactos en punto sin solapamiento</span>
        </div>
        <p className="text-[11px] text-slate-600">
          Desarrollado bajo metodología Spec-Driven Development (SDD).
        </p>
      </footer>
    </div>
  );
};

/**
 * Página principal de Agendamiento
 */
const HomePage: FC = () => {
  const navigate = useNavigate();

  return (
    <BookingFlow
      onNavigateToMyAppointments={(code) => {
        navigate(`/mis-citas?code=${encodeURIComponent(code)}`);
      }}
    />
  );
};

/**
 * Página de Mis Citas (soporta ?code=BR-XXXX en la URL)
 */
const MyAppointmentsPage: FC = () => {
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code');

  return <MyAppointments initialSearchCode={initialCode} />;
};

/**
 * Página y Ruta Administrativa (/admin)
 */
const AdminRoute: FC<{
  token: string | null;
  user: AdminUser | null;
  onLoginSuccess: (token: string, user: AdminUser) => void;
  onLogout: () => void;
}> = ({ token, user, onLoginSuccess, onLogout }) => {
  const navigate = useNavigate();

  if (token && user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        <AdminDashboard
          user={user}
          token={token}
          onLogout={onLogout}
          onBackToPublic={() => navigate('/')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <AdminLogin
        onLoginSuccess={onLoginSuccess}
        onCancel={() => navigate('/')}
      />
    </div>
  );
};

export default function App() {
  // Estado de autenticación del Administrador
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem('barberred_admin_token');
  });
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    const cached = localStorage.getItem('barberred_admin_user');
    return cached ? JSON.parse(cached) : null;
  });

  const handleLoginSuccess = (token: string, user: AdminUser) => {
    localStorage.setItem('barberred_admin_token', token);
    localStorage.setItem('barberred_admin_user', JSON.stringify(user));
    setAdminToken(token);
    setAdminUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('barberred_admin_token');
    localStorage.removeItem('barberred_admin_user');
    setAdminToken(null);
    setAdminUser(null);
  };

  // Validar token activo con el backend
  useEffect(() => {
    if (adminToken) {
      fetch('/api/admin/auth/me', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
        .then((res) => {
          if (!res.ok) {
            handleLogout();
          }
        })
        .catch(() => {});
    }
  }, [adminToken]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas para Clientes */}
        <Route
          path="/"
          element={
            <PublicLayout>
              <HomePage />
            </PublicLayout>
          }
        />
        <Route
          path="/mis-citas"
          element={
            <PublicLayout>
              <MyAppointmentsPage />
            </PublicLayout>
          }
        />

        {/* Rutas Administrativas Reservadas */}
        <Route
          path="/admin"
          element={
            <AdminRoute
              token={adminToken}
              user={adminUser}
              onLoginSuccess={handleLoginSuccess}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/admin/login"
          element={
            <AdminRoute
              token={adminToken}
              user={adminUser}
              onLoginSuccess={handleLoginSuccess}
              onLogout={handleLogout}
            />
          }
        />

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
