import { useState, type FC } from 'react';
import type { AdminUser } from '../../types/index.js';
import { AdminAgendaView } from './AdminAgendaView.js';
import { AdminScheduleView } from './AdminScheduleView.js';
import { AdminBarbersView } from './AdminBarbersView.js';
import {
  Calendar,
  Clock,
  Users,
  LogOut,
  ArrowLeft,
} from 'lucide-react';

interface AdminDashboardProps {
  user: AdminUser;
  token: string;
  onLogout: () => void;
  onBackToPublic: () => void;
}

export const AdminDashboard: FC<AdminDashboardProps> = ({
  user,
  token,
  onLogout,
  onBackToPublic,
}) => {
  const [adminTab, setAdminTab] = useState<'agenda' | 'schedule' | 'barbers'>('agenda');

  return (
    <div className="space-y-6">
      {/* Barra de Control Administrativa */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToPublic}
            title="Volver a la vista del cliente"
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-white">Panel Backoffice</span>
              <span className="text-[10px] font-bold bg-red-950/80 text-red-400 px-2 py-0.5 rounded-full border border-red-800">
                ADMIN
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Sesión activa como: <strong className="text-slate-200">{user.name}</strong> ({user.email})
            </p>
          </div>
        </div>

        {/* Subpestañas del Admin y Botón Salir */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setAdminTab('agenda')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                adminTab === 'agenda'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Agenda Diaria</span>
            </button>

            <button
              type="button"
              onClick={() => setAdminTab('schedule')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                adminTab === 'schedule'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Horarios & Bloqueos</span>
            </button>

            <button
              type="button"
              onClick={() => setAdminTab('barbers')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                adminTab === 'barbers'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Barberos</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Cerrar sesión de administrador"
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 hover:border-red-900/60 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contenido según Pestaña Administrativa */}
      {adminTab === 'agenda' && <AdminAgendaView token={token} />}
      {adminTab === 'schedule' && <AdminScheduleView token={token} />}
      {adminTab === 'barbers' && <AdminBarbersView token={token} />}
    </div>
  );
};
