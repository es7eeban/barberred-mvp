import { useState, useEffect, type FC } from 'react';
import type { Appointment } from '../../types/index.js';
import { StatusBadge } from '../common/StatusBadge.js';
import { RescheduleModal } from './RescheduleModal.js';
import { CancelModal } from './CancelModal.js';
import {
  canModifyOrCancel,
  generateGoogleCalendarUrl,
  downloadIcsFile,
} from '../../utils/calendar.js';
import {
  Search,
  Calendar,
  Clock,
  User,
  Phone,
  AlertCircle,
  CheckCircle2,
  CalendarClock,
  XCircle,
  Loader2,
  CalendarPlus,
  Download,
  AlertTriangle,
} from 'lucide-react';

interface MyAppointmentsProps {
  initialSearchCode?: string | null;
}

export const MyAppointments: FC<MyAppointmentsProps> = ({ initialSearchCode }) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchCode || '');
  const [searching, setSearching] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modales
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);
  const [cancelAppointment, setCancelAppointment] = useState<Appointment | null>(null);

  const performSearch = async (query: string) => {
    const q = query.trim();
    if (!q) return;

    setSearching(true);
    setSearchError(null);
    setActionSuccess(null);
    setAppointments([]);

    try {
      if (q.toUpperCase().startsWith('BR-')) {
        const res = await fetch(`/api/appointments/${q.toUpperCase()}`);
        if (!res.ok) {
          setSearchError(`No se encontró ninguna cita con el código ${q.toUpperCase()}.`);
        } else {
          const data = await res.json();
          setAppointments([data]);
        }
      } else {
        const res = await fetch(`/api/appointments/lookup?phone=${encodeURIComponent(q)}`);
        if (!res.ok) {
          setSearchError('No se encontraron citas con ese número telefónico.');
        } else {
          const data = await res.json();
          if (data.length === 0) {
            setSearchError('No tienes citas registradas con ese número.');
          } else {
            setAppointments(data);
          }
        }
      }
    } catch {
      setSearchError('Error al comunicarse con el servidor.');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (initialSearchCode) {
      setSearchQuery(initialSearchCode);
      performSearch(initialSearchCode);
    }
  }, [initialSearchCode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const handleRescheduleSuccess = (updated: Appointment) => {
    setActionSuccess(`Tu cita ${updated.code} fue reprogramada con éxito.`);
    setAppointments((prev) => prev.map((a) => (a.code === updated.code ? updated : a)));
  };

  const handleCancelSuccess = (code: string) => {
    setActionSuccess(`La cita ${code} ha sido cancelada y el horario fue liberado.`);
    setAppointments((prev) =>
      prev.map((a) => (a.code === code ? { ...a, status: 'CANCELLED_CLIENT' } : a)),
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Gestiona tus Citas en <span className="text-red-500">BarberRed</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Ingresa tu número telefónico o tu código único (ej.{' '}
          <code className="text-red-400 font-mono font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
            BR-9481
          </code>
          ) para consultar, reprogramar o cancelar tus citas.
        </p>
      </div>

      {/* Buscador */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
          <input
            type="text"
            required
            placeholder="Código BR-XXXX o Teléfono (+56 9 ...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-600/20"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span>Buscar</span>
        </button>
      </form>

      {/* Mensajes de Éxito y Error */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-400 text-xs flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {searchError && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/80 text-red-400 text-xs flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{searchError}</span>
        </div>
      )}

      {/* Listado de Citas Encontradas */}
      <div className="space-y-4">
        {appointments.map((app) => {
          const formattedDate = new Date(app.date).toLocaleDateString('es-ES', {
            timeZone: 'UTC',
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });

          const modifyCheck = canModifyOrCancel(app.date, app.startTime);
          const isConfirmed = app.status === 'CONFIRMED';

          return (
            <div
              key={app.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 transition-all hover:border-slate-700"
            >
              {/* Encabezado de la Tarjeta */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-800 pb-3 gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-black text-red-500 text-lg tracking-wider">
                    {app.code}
                  </span>
                  <StatusBadge status={app.status} />
                </div>
                <span className="text-xs text-slate-400 capitalize flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-red-500" />
                  {formattedDate}
                </span>
              </div>

              {/* Contenido de la cita */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/60">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    Barbero Asignado:
                  </span>
                  <p className="font-bold text-white text-sm">{app.barber?.name || 'Profesional de staff'}</p>
                </div>

                <div className="space-y-1 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/60">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Horario de Atención:
                  </span>
                  <p className="font-mono font-bold text-slate-200 text-sm">
                    {app.startTime} a {app.endTime} hrs
                  </p>
                </div>

                <div className="space-y-1 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/60">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    Cliente:
                  </span>
                  <p className="font-semibold text-slate-300">{app.clientName}</p>
                </div>

                <div className="space-y-1 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/60">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    Teléfono Registrado:
                  </span>
                  <p className="font-semibold text-slate-300">{app.clientPhone}</p>
                </div>
              </div>

              {/* Motivo de cancelación si aplica */}
              {app.cancelReason && (
                <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-2xl text-xs text-red-400">
                  <span className="font-bold">Motivo de cancelación:</span> {app.cancelReason}
                </div>
              )}

              {/* Advertencia de la ventana de 2 horas */}
              {isConfirmed && !modifyCheck.allowed && (
                <div className="p-3 bg-amber-950/30 border border-amber-900/50 rounded-2xl text-xs text-amber-400 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Ventana de gestión web cerrada:</span>
                    <span>
                      {modifyCheck.message ||
                        'Quedan menos de 2 horas para el turno. Para imprevistos de última hora, contacta directamente con el local.'}
                    </span>
                  </div>
                </div>
              )}

              {/* Botones de Acción */}
              {isConfirmed && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  {/* Atajos de Calendario */}
                  <div className="flex items-center gap-2">
                    <a
                      href={generateGoogleCalendarUrl(app)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Agregar a Google Calendar"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1.5 border border-slate-700"
                    >
                      <CalendarPlus className="w-3.5 h-3.5 text-red-400" />
                      <span className="hidden sm:inline">Google Calendar</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => downloadIcsFile(app)}
                      title="Descargar archivo .ics"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1.5 border border-slate-700"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">.ICS</span>
                    </button>
                  </div>

                  {/* Botones Modificar y Cancelar */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!modifyCheck.allowed}
                      onClick={() => setRescheduleAppointment(app)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        !modifyCheck.allowed
                          ? 'bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      <CalendarClock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Reprogramar</span>
                    </button>

                    <button
                      type="button"
                      disabled={!modifyCheck.allowed}
                      onClick={() => setCancelAppointment(app)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        !modifyCheck.allowed
                          ? 'bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed'
                          : 'bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-800/80'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancelar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modales */}
      <RescheduleModal
        appointment={rescheduleAppointment}
        isOpen={!!rescheduleAppointment}
        onClose={() => setRescheduleAppointment(null)}
        onSuccess={handleRescheduleSuccess}
      />

      <CancelModal
        appointment={cancelAppointment}
        isOpen={!!cancelAppointment}
        onClose={() => setCancelAppointment(null)}
        onSuccess={handleCancelSuccess}
      />
    </div>
  );
};
