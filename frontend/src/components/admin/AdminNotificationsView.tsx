import { useState, useEffect, type FC } from 'react';
import type { NotificationLog } from '../../types/index.js';
import {
  MessageSquare,
  Smartphone,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Calendar,
  User,
  Clock,
} from 'lucide-react';

interface AdminNotificationsViewProps {
  token: string;
}

export const AdminNotificationsView: FC<AdminNotificationsViewProps> = ({
  token,
}) => {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'WHATSAPP' | 'SMS'>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:3000/api/admin/notifications', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Error al obtener el historial de notificaciones.');
      }

      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token]);

  const filteredLogs = logs.filter((log) => {
    if (channelFilter !== 'ALL' && log.channel !== channelFilter) {
      return false;
    }
    if (!search.trim()) return true;

    const term = search.toLowerCase();
    const phoneMatch = log.recipient.toLowerCase().includes(term);
    const codeMatch = log.appointment?.code.toLowerCase().includes(term);
    const nameMatch = log.appointment?.clientName.toLowerCase().includes(term);
    const bodyMatch = log.messageBody.toLowerCase().includes(term);

    return phoneMatch || codeMatch || nameMatch || bodyMatch;
  });

  const formatDateTime = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleString('es-CL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header y Filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            <span>Auditoría de Notificaciones Transaccionales</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Registro en tiempo real de mensajes automáticos (WhatsApp / SMS) despachados a clientes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Filtro por Canal */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setChannelFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                channelFilter === 'ALL'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter('WHATSAPP')}
              className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                channelFilter === 'WHATSAPP'
                  ? 'bg-emerald-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3 h-3 text-emerald-300" />
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter('SMS')}
              className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                channelFilter === 'SMS'
                  ? 'bg-sky-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3 h-3 text-sky-300" />
              SMS
            </button>
          </div>

          {/* Refrescar */}
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors disabled:opacity-50"
            title="Actualizar registros"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por teléfono (+569...), código de cita (BR-XXXX) o cliente..."
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
        />
      </div>

      {/* Contenido / Lista */}
      {loading && logs.length === 0 ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
        </div>
      ) : error ? (
        <div className="bg-red-950/40 border border-red-800 text-red-300 p-4 rounded-2xl text-center text-sm">
          {error}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center">
          <MessageSquare className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">
            No hay registros de notificaciones
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search
              ? 'No se encontraron resultados para la búsqueda ingresada.'
              : 'Cuando un cliente reserve, reprograme o cancele una cita, el registro aparecerá automáticamente aquí.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div
                key={log.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 transition-all shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Canal Badge */}
                    <div
                      className={`p-2.5 rounded-xl border flex items-center justify-center ${
                        log.channel === 'WHATSAPP'
                          ? 'bg-emerald-950/80 border-emerald-800 text-emerald-400'
                          : 'bg-sky-950/80 border-sky-800 text-sky-400'
                      }`}
                      title={log.channel}
                    >
                      {log.channel === 'WHATSAPP' ? (
                        <MessageSquare className="w-4 h-4" />
                      ) : (
                        <Smartphone className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">
                          {log.recipient}
                        </span>
                        {log.appointment && (
                          <span className="text-xs font-mono font-semibold bg-slate-950 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-md">
                            {log.appointment.code}
                          </span>
                        )}
                        {/* Estado */}
                        {log.status === 'SENT' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                            <CheckCircle className="w-3 h-3" />
                            Enviado
                          </span>
                        ) : log.status === 'FAILED' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-950/60 px-2 py-0.5 rounded-full border border-red-800">
                            <AlertCircle className="w-3 h-3" />
                            Fallido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800">
                            <Clock className="w-3 h-3" />
                            Pendiente
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        {log.appointment && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-500" />
                            {log.appointment.clientName} (Barbero: {log.appointment.barber.name})
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {formatDateTime(log.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="text-xs font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      {isExpanded ? 'Ocultar mensaje' : 'Ver mensaje completo'}
                    </button>
                  </div>
                </div>

                {/* Vista previa o mensaje expandido */}
                {isExpanded ? (
                  <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
                      {log.messageBody}
                    </div>
                    {log.externalId && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <span>ID externo / SID:</span>
                        <code className="text-slate-400">{log.externalId}</code>
                      </div>
                    )}
                    {log.errorDetails && (
                      <div className="bg-red-950/40 border border-red-900 text-red-300 p-2.5 rounded-xl text-xs">
                        <strong>Detalles del error:</strong> {log.errorDetails}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-400 line-clamp-1 italic bg-slate-950/50 px-3 py-1.5 rounded-xl border border-slate-800/50">
                    "{log.messageBody.split('\n')[0]}..."
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
