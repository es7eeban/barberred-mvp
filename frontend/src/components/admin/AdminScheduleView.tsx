import { useState, useEffect, useCallback, type FC } from 'react';
import type { AdminBarber, WorkingHour } from '../../types/index.js';
import { CreateBlockModal } from './CreateBlockModal.js';
import {
  Clock,
  Calendar,
  Save,
  Trash2,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

interface AdminScheduleViewProps {
  token: string;
}

export const AdminScheduleView: FC<AdminScheduleViewProps> = ({ token }) => {
  const [barbers, setBarbers] = useState<AdminBarber[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [createBlockOpen, setCreateBlockOpen] = useState(false);

  // Cargar datos de barberos
  const fetchBarbersData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/barbers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok && Array.isArray(data)) {
        setBarbers(data);
        if (data.length > 0) {
          const currentId = selectedBarberId || data[0].id;
          setSelectedBarberId(currentId);
          const currentBarber = data.find((b: any) => b.id === currentId) || data[0];
          setWorkingHours(currentBarber.workingHours || []);
        }
      }
    } catch {
      setErrorMsg('Error al consultar configuración de barberos.');
    } finally {
      setLoading(false);
    }
  }, [token, selectedBarberId]);

  useEffect(() => {
    fetchBarbersData();
  }, [fetchBarbersData]);

  // Cambiar barbero seleccionado
  const handleBarberChange = (id: string) => {
    setSelectedBarberId(id);
    const b = barbers.find((x) => x.id === id);
    if (b) {
      setWorkingHours(b.workingHours || []);
    }
  };

  const handleHourChange = (
    dayOfWeek: number,
    field: 'startHour' | 'endHour' | 'isActive',
    value: any,
  ) => {
    setWorkingHours((prev) =>
      prev.map((wh) => (wh.dayOfWeek === dayOfWeek ? { ...wh, [field]: value } : wh)),
    );
  };

  // Guardar jornada laboral
  const handleSaveSchedule = async () => {
    if (!selectedBarberId) return;

    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const payload = {
        workingHours: workingHours.map((wh) => ({
          dayOfWeek: wh.dayOfWeek,
          startHour: Number(wh.startHour),
          endHour: Number(wh.endHour),
          isActive: Boolean(wh.isActive),
        })),
      };

      const res = await fetch(`/api/admin/barbers/${selectedBarberId}/schedule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message || 'Error al guardar la jornada.');
      } else {
        setSuccessMsg('Jornada laboral actualizada exitosamente.');
        fetchBarbersData();
      }
    } catch {
      setErrorMsg('Error de conexión al guardar.');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar bloqueo
  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('¿Deseas eliminar este bloqueo?')) return;

    try {
      const res = await fetch(`/api/admin/schedule-blocks/${blockId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchBarbersData();
      }
    } catch {
      alert('Error al eliminar bloqueo.');
    }
  };

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  const selectedBarber = barbers.find((b) => b.id === selectedBarberId);
  const activeBlocks = selectedBarber?.scheduleBlocks || [];

  return (
    <div className="space-y-8">
      {/* Selector de Barbero */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-base font-bold text-white">Configuración de Jornada y Disponibilidad</h3>
          <p className="text-xs text-slate-400">
            Define los horarios de apertura, cierre y descansos por barbero.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedBarberId}
            onChange={(e) => handleBarberChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white font-bold focus:outline-none focus:border-red-500"
          >
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setCreateBlockOpen(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Bloqueo</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/80 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          <span className="text-xs">Cargando jornada...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Columna Izquierda: Grilla Semanal de Horarios */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Clock className="w-4 h-4 text-red-500" />
                <span>Horario Semanal de Atención ({selectedBarber?.name})</span>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveSchedule}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/20 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>

            <div className="divide-y divide-slate-800/60">
              {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                const wh = workingHours.find((x) => x.dayOfWeek === dayIdx) || {
                  id: '',
                  barberId: selectedBarberId,
                  dayOfWeek: dayIdx,
                  startHour: 10,
                  endHour: 19,
                  isActive: dayIdx !== 0,
                };

                return (
                  <div
                    key={dayIdx}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-[140px]">
                      <input
                        type="checkbox"
                        checked={wh.isActive}
                        onChange={(e) =>
                          handleHourChange(dayIdx, 'isActive', e.target.checked)
                        }
                        className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                      />
                      <span
                        className={`font-semibold ${
                          wh.isActive ? 'text-white' : 'text-slate-500 line-through'
                        }`}
                      >
                        {dayNames[dayIdx]}
                      </span>
                    </div>

                    {wh.isActive ? (
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-400">De:</span>
                        <select
                          value={wh.startHour}
                          onChange={(e) =>
                            handleHourChange(dayIdx, 'startHour', Number(e.target.value))
                          }
                          className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-white focus:outline-none focus:border-red-500"
                        >
                          {Array.from({ length: 24 }).map((_, h) => (
                            <option key={h} value={h}>
                              {String(h).padStart(2, '0')}:00
                            </option>
                          ))}
                        </select>

                        <span className="text-slate-400">A:</span>
                        <select
                          value={wh.endHour}
                          onChange={(e) =>
                            handleHourChange(dayIdx, 'endHour', Number(e.target.value))
                          }
                          className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-white focus:outline-none focus:border-red-500"
                        >
                          {Array.from({ length: 24 }).map((_, h) => (
                            <option key={h + 1} value={h + 1}>
                              {String(h + 1).padStart(2, '0')}:00
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-[11px] italic">Cerrado / Descanso</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Columna Derecha: Bloqueos y Excepciones Activas */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
                <ShieldAlert className="w-4 h-4" />
                <span>Bloqueos Administrativos Activos</span>
              </div>
              <span className="text-xs text-slate-400 font-mono font-bold">
                {activeBlocks.length}
              </span>
            </div>

            {activeBlocks.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No hay bloqueos activos registrados para este barbero.
              </p>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {activeBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between text-xs gap-3"
                  >
                    <div className="space-y-1">
                      <p className="font-bold text-white flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-red-500" />
                        <span>
                          {new Date(block.date).toLocaleDateString('es-ES', {
                            timeZone: 'UTC',
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        <span className="text-amber-400 font-mono">
                          {block.isFullDay ? '(Día Completo)' : `(${block.startTime} hrs)`}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Motivo: <strong className="text-slate-300">{block.reason || 'Sin motivo'}</strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteBlock(block.id)}
                      title="Eliminar bloqueo"
                      className="p-2 rounded-xl bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition-colors border border-slate-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Bloqueo */}
      <CreateBlockModal
        barbers={barbers}
        defaultBarberId={selectedBarberId}
        token={token}
        isOpen={createBlockOpen}
        onClose={() => setCreateBlockOpen(false)}
        onSuccess={() => fetchBarbersData()}
      />
    </div>
  );
};
