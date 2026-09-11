import { useState } from 'react';
import { BookingFlow } from './components/booking/BookingFlow.js';
import { MyAppointments } from './components/appointments/MyAppointments.js';
import { Scissors, Calendar, UserCheck, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'booking' | 'my-appointments'>('booking');
  const [initialSearchCode, setInitialSearchCode] = useState<string | null>(null);

  const handleNavigateToMyAppointments = (code: string) => {
    setInitialSearchCode(code);
    setActiveTab('my-appointments');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-red-600 selection:text-white font-sans">
      {/* Barra de Navegación Superior */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md sticky top-0 z-40 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo BarberRed */}
          <div
            onClick={() => {
              setActiveTab('booking');
              setInitialSearchCode(null);
            }}
            className="flex items-center gap-3 cursor-pointer group"
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
          </div>

          {/* Selector de Pestañas */}
          <nav className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('booking');
                setInitialSearchCode(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'booking'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Agendar Hora</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('my-appointments')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'my-appointments'
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
        {activeTab === 'booking' ? (
          <BookingFlow onNavigateToMyAppointments={handleNavigateToMyAppointments} />
        ) : (
          <MyAppointments initialSearchCode={initialSearchCode} />
        )}
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
}
