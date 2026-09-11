import { useState, useEffect, useCallback, type FC } from 'react';
import type { AdminBarber } from '../../types/index.js';
import { Scissors, Phone, Clock, Loader2, CheckCircle2 } from 'lucide-react';

interface AdminBarbersViewProps {
  token: string;
}

export const AdminBarbersView: FC<AdminBarbersViewProps> = ({ token }) => {
  const [barbers, setBarbers] = useState<AdminBarber[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBarbers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/barbers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setBarbers(data);
      }
    } catch {
      console.error('Error cargando staff');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBarbers();
  }, [fetchBarbers]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-white">Staff de Barberos</h3>
          <p className="text-xs text-slate-400">
            Profesionales activos para atención de turnos en BarberRed.
          </p>
        </div>
        <span className="text-xs font-mono font-bold bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300">
          {barbers.length} Barberos registrados
        </span>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          <span className="text-xs">Cargando staff...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {barbers.map((barber) => {
            const activeDays = barber.workingHours.filter((wh) => wh.isActive).length;

            return (
              <div
                key={barber.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={barber.avatarUrl || 'https://via.placeholder.com/150'}
                    alt={barber.name}
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-700 shadow-md"
                  />
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-white">{barber.name}</h4>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      Activo para reservas
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      Teléfono:
                    </span>
                    <span className="text-slate-200 font-mono font-semibold">
                      {barber.phone || 'No registrado'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Jornada semanal:
                    </span>
                    <span className="text-slate-200 font-semibold">
                      {activeDays} días activos a la semana
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-slate-500" />
                      Duración de turno:
                    </span>
                    <span className="text-slate-200 font-semibold">
                      60 min (45 min servicio + 15 buffer)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
