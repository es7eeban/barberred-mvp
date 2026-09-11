import { useState, useEffect, type FC, type ReactNode } from 'react';
import { BookingFlow } from './components/booking/BookingFlow.js';
import { MyAppointments } from './components/appointments/MyAppointments.js';
import { AdminLogin } from './components/admin/AdminLogin.js';
import { AdminDashboard } from './components/admin/AdminDashboard.js';
import type { AdminUser } from './types/index.js';
import { Scissors, Calendar, UserCheck, ShieldCheck } from 'lucide-react';

/**
 * Hook de enrutamiento basado en la API nativa de History del navegador.
 * Garantiza total compatibilidad con React 19 y URLs limpias sin dependencias externas.
 */
function useRouter() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const [currentSearch, setCurrentSearch] = useState(() => window.location.search);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      setCurrentSearch(window.location.search);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (to: string) => {
    window.history.pushState({}, '', to);
    setCurrentPath(window.location.pathname);
    setCurrentSearch(window.location.search);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return {
    path: currentPath,
    search: currentSearch,
    navigate,
  };
}

/**
 * Layout Público exclusivo para clientes finales.
 * NO contiene botones, enlaces ni pistas del acceso al Backoffice.
 */
const PublicLayout: FC<{
  currentPath: string;
  onNavigate: (to: string) => void;
  children: ReactNode;
}> = ({ currentPath, onNavigate, children }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-red-600 selection:text-white font-sans">
      {/* Barra de Navegación Pública */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md sticky top-0 z-40 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo BarberRed */}
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="flex items-center gap-3 cursor-pointer group text-left"
          >
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
          </button>

          {/* Menú de Clientes: Únicamente "Agendar Hora" y "Mis Citas" */}
          <nav className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentPath === '/'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Agendar Hora</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('/mis-citas')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentPath.startsWith('/mis-citas')
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Mis Citas</span>
            </button>
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

export default function App() {
  const { path, search, navigate } = useRouter();

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
    navigate('/admin');
  };

  const handleLogout = () => {
    localStorage.removeItem('barberred_admin_token');
    localStorage.removeItem('barberred_admin_user');
    setAdminToken(null);
    setAdminUser(null);
    navigate('/admin');
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

  // Si la ruta comienza con /admin
  const isAdminRoute = path.startsWith('/admin');

  if (isAdminRoute) {
    if (adminToken && adminUser) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          <AdminDashboard
            user={adminUser}
            token={adminToken}
            onLogout={handleLogout}
            onBackToPublic={() => navigate('/')}
          />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <AdminLogin
          onLoginSuccess={handleLoginSuccess}
          onCancel={() => navigate('/')}
        />
      </div>
    );
  }

  // Rutas Públicas
  const searchParams = new URLSearchParams(search);
  const codeParam = searchParams.get('code');

  return (
    <PublicLayout currentPath={path} onNavigate={navigate}>
      {path.startsWith('/mis-citas') ? (
        <MyAppointments initialSearchCode={codeParam} />
      ) : (
        <BookingFlow
          onNavigateToMyAppointments={(code) => {
            navigate(`/mis-citas?code=${encodeURIComponent(code)}`);
          }}
        />
      )}
    </PublicLayout>
  );
}
