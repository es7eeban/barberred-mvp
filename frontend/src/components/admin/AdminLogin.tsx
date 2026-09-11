import { useState, type FC, type FormEvent } from 'react';
import type { AdminUser } from '../../types/index.js';
import { Lock, Mail, KeyRound, Loader2, AlertCircle, Sparkles, ArrowLeft } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (token: string, user: AdminUser) => void;
  onCancel: () => void;
}

export const AdminLogin: FC<AdminLoginProps> = ({ onLoginSuccess, onCancel }) => {
  const [email, setEmail] = useState('admin@barberred.com');
  const [password, setPassword] = useState('Admin123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Credenciales inválidas. Verifica tu correo y contraseña.');
      } else {
        onLoginSuccess(data.accessToken, data.user);
      }
    } catch {
      setError('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('admin@barberred.com');
    setPassword('Admin123!');
    setError(null);
  };

  return (
    <div className="max-w-md mx-auto my-8 p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
      <button
        type="button"
        onClick={onCancel}
        className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Volver a la web pública</span>
      </button>

      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center mx-auto shadow-lg shadow-red-600/20">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">Acceso Administrativo</h2>
        <p className="text-xs text-slate-400">
          Panel de control para dueños y barberos de <strong className="text-slate-200">BarberRed</strong>.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/80 text-red-400 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Correo Electrónico
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="email"
              required
              placeholder="admin@barberred.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Contraseña
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Iniciando sesión...</span>
            </>
          ) : (
            <span>Ingresar al Backoffice</span>
          )}
        </button>
      </form>

      {/* Credenciales de Prueba Rápidas */}
      <div className="pt-2 border-t border-slate-800/80">
        <button
          type="button"
          onClick={handleFillDemo}
          className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Cargar credenciales de prueba (Admin)</span>
        </button>
      </div>
    </div>
  );
};
