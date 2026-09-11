import { useState, useEffect, useCallback, type FC } from 'react';
import type { Appointment, Barber, ScheduleBlock } from '../../types/index.js';
import { StatusBadge } from '../common/StatusBadge.js';
import { AdminCancelModal } from './AdminCancelModal.js';
import { CreateBlockModal } from './CreateBlockModal.js';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  PlusCircle,
  XCircle,
  Unlock,
  Loader2,
  AlertCircle,
  Clock,
  User,
  Phone,
} from 'lucide-react';

interface AdminAgendaViewProps {
  token: string;
}

export const AdminAgendaView: FC<AdminAgendaViewProps> = ({ token }) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string>('ALL');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modales
  const [cancelModalAppt, setCancelModalAppt] = useState<Appointment | null>(null);
  const [createBlockModalOpen, setCreateBlockModalOpen] = useState(false);
  const [blockPreFill, setBlockPreFill] = useState<{ barberId?: string; time?: string }>({});

  // Cargar barberos
  useEffect(() => {
    fetch('/api/barbers')
      .then((res) => res.json())
      .then((data: Barber[]) => {
        if (Array.isArray(data)) setBarbers(data);
      })
      .catch((err) => console.error('Error cargando barberos:', err));
  }, []);

  // Cargar citas y bloques para la fecha seleccionada
  const fetchAgendaData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Citas del día
      const apptUrl = `/api/admin/appointments?date=${selectedDate}${
        selectedBarberId !== 'ALL' ? `&barberId=${selectedBarberId}` : ''
      }`;
      const apptRes = await fetch(apptUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const apptData = await apptRes.json();

      if (apptRes.ok && Array.isArray(apptData)) {
        setAppointments(apptData);
      }

      // 2. Barbero details with schedule blocks
      const barberRes = await fetch('/api/admin/barbers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const barberData = await barberRes.json();

      if (barberRes.ok && Array.isArray(barberData)) {
        const allBlocks: ScheduleBlock[] = [];
        barberData.forEach((b: any) => {
          if (Array.isArray(b.scheduleBlocks)) {
            b.scheduleBlocks.forEach((sb: ScheduleBlock) => {
              const blockDate = sb.date.split('T')[0];
              if (blockDate === selectedDate) {
                allBlocks.push({ ...sb, barber: { id: b.id, name: b.name } });
              }
            });
          }
        });
        setBlocks(allBlocks);
      }
    } catch {
      setError('Error al consultar agenda diaria.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedBarberId, token]);

  useEffect(() => {
    fetchAgendaData();
  }, [fetchAgendaData]);

  // Navegación de fecha (día anterior, día siguiente)
  const changeDateByDays = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + days);
    setSelectedDate(dateObj.toISOString().split('T')[0]);
  };

  const handleUnblock = async (blockId: string) => {
    if (!confirm('¿Deseas desbloquear este horario?')) return;

    try {
      const res = await fetch(`/api/admin/schedule-blocks/${blockId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchAgendaData();
      } else {
        alert('No fue posible desbloquear el horario.');
      }
    } catch {
      alert('Error de conexión al desbloquear.');
    }
  };

  const standardHours = [
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00',
  ];

  const visibleBarbers =
    selectedBarberId === 'ALL'
      ? barbers
      : barbers.filter((b) => b.id === selectedBarberId);

  return (
    <div className="space-y-6">
      {/* Barra de Control de la Agenda */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Navegador de Fecha */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeDateByDays(-1)}
              title="Día anterior"
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-red-500 cursor-pointer"
            />

            <button
              type="button"
              onClick={() => changeDateByDays(1)}
              title="Día siguiente"
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
            >
              Hoy
            </button>
          </div>

          {/* Filtros y Acción Rápida */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro Barbero */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedBarberId}
                onChange={(e) => setSelectedBarberId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              >
                <option value="ALL">Todos los Barberos</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Botón Bloquear */}
            <button
              type="button"
              onClick={() => {
                setBlockPreFill({});
                setCreateBlockModalOpen(true);
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Bloquear Horario / Día</span>
            </button>
          </div>
        </div>

        {/* Fecha Formateada */}
        <div className="text-xs text-slate-400 border-t border-slate-800/80 pt-3 flex items-center justify-between">
          <span className="capitalize font-semibold text-slate-200 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-red-500" />
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
          <span>
            {appointments.filter((a) => a.status === 'CONFIRMED').length} Citas confirmadas en este día
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/80 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          <span className="text-xs">Cargando agenda de turnos...</span>
        </div>
      ) : (
        /* Grilla Matrix de Agenda Diaria */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80">
                  <th className="p-3.5 text-slate-400 font-bold uppercase tracking-wider w-24 border-r border-slate-800 text-center">
                    Hora
                  </th>
                  {visibleBarbers.map((b) => (
                    <th key={b.id} className="p-3.5 text-white font-bold tracking-tight min-w-[240px]">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={b.avatarUrl || 'https://via.placeholder.com/150'}
                          alt={b.name}
                          className="w-7 h-7 rounded-full object-cover border border-slate-700"
                        />
                        <span>{b.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {standardHours.map((hour) => (
                  <tr key={hour} className="hover:bg-slate-800/30 transition-colors">
                    {/* Columna Hora */}
                    <td className="p-3 text-center font-mono font-bold text-slate-300 border-r border-slate-800 bg-slate-950/30">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{hour}</span>
                      </div>
                    </td>

                    {/* Columnas por Barbero */}
                    {visibleBarbers.map((b) => {
                      // 1. Buscar si hay cita confirmada en este horario
                      const appt = appointments.find(
                        (a) => a.barberId === b.id && a.startTime === hour,
                      );

                      // 2. Buscar si hay bloqueo parcial o total
                      const block = blocks.find(
                        (bl) =>
                          bl.barberId === b.id &&
                          (bl.isFullDay || bl.startTime === hour),
                      );

                      return (
                        <td key={b.id} className="p-2.5 align-top">
                          {appt ? (
                            /* Slot con Cita */
                            <div
                              className={`p-3 rounded-2xl border transition-all space-y-2 ${
                                appt.status === 'CONFIRMED'
                                  ? 'bg-slate-950 border-red-900/60 shadow-md shadow-red-950/20'
                                  : 'bg-slate-950/50 border-slate-800 opacity-60'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-black text-red-400 text-xs">
                                  {appt.code}
                                </span>
                                <StatusBadge status={appt.status} />
                              </div>

                              <div className="space-y-0.5 text-[11px]">
                                <p className="font-bold text-slate-100 flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-500" />
                                  <span>{appt.clientName}</span>
                                </p>
                                <p className="text-slate-400 font-mono flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-500" />
                                  <span>{appt.clientPhone}</span>
                                </p>
                              </div>

                              {appt.status === 'CONFIRMED' && (
                                <div className="pt-1 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => setCancelModalAppt(appt)}
                                    className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-800/80 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    <span>Cancelar</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : block ? (
                            /* Slot Bloqueado */
                            <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-900/50 text-amber-300 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[11px] uppercase tracking-wider text-amber-400">
                                  🚫 {block.isFullDay ? 'Día Bloqueado' : 'Hora Bloqueada'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUnblock(block.id)}
                                  title="Desbloquear franja"
                                  className="p-1 rounded-lg hover:bg-amber-900/60 text-amber-400 transition-colors"
                                >
                                  <Unlock className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <p className="text-[11px] text-amber-200/80">
                                Motivo: {block.reason || 'Sin especificar'}
                              </p>
                            </div>
                          ) : (
                            /* Slot Libre */
                            <div className="h-full min-h-[56px] rounded-2xl border border-dashed border-slate-800/80 hover:border-slate-700 bg-slate-950/20 p-2 flex items-center justify-between group transition-colors">
                              <span className="text-slate-500 text-[11px] pl-1 font-medium">Libre</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setBlockPreFill({ barberId: b.id, time: hour });
                                  setCreateBlockModalOpen(true);
                                }}
                                className="opacity-0 group-hover:opacity-100 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold transition-all"
                              >
                                Bloquear
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Cancelación Administrativa */}
      <AdminCancelModal
        appointment={cancelModalAppt}
        token={token}
        isOpen={!!cancelModalAppt}
        onClose={() => setCancelModalAppt(null)}
        onSuccess={() => fetchAgendaData()}
      />

      {/* Modal de Bloqueo de Horario */}
      <CreateBlockModal
        barbers={barbers}
        defaultBarberId={blockPreFill.barberId}
        defaultDate={selectedDate}
        defaultStartTime={blockPreFill.time}
        token={token}
        isOpen={createBlockModalOpen}
        onClose={() => setCreateBlockModalOpen(false)}
        onSuccess={() => fetchAgendaData()}
      />
    </div>
  );
};
