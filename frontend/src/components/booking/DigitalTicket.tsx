import { useState, type FC } from 'react';
import type { Appointment } from '../../types/index.js';
import {
  generateGoogleCalendarUrl,
  downloadIcsFile,
  getWhatsAppShareUrl,
} from '../../utils/calendar.js';
import {
  CheckCircle2,
  Copy,
  Check,
  Calendar,
  Clock,
  User,
  Phone,
  Share2,
  Download,
  CalendarPlus,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface DigitalTicketProps {
  appointment: Appointment;
  onNewBooking: () => void;
  onViewInMyAppointments: (code: string) => void;
}

export const DigitalTicket: FC<DigitalTicketProps> = ({
  appointment,
  onNewBooking,
  onViewInMyAppointments,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appointment.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = new Date(appointment.date).toLocaleDateString('es-ES', {
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
      {/* Icono de Éxito */}
      <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          ¡Cita Confirmada con Éxito!
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Guarda o comparte tu comprobante digital para gestionar tu reserva en cualquier momento.
        </p>
      </div>

      {/* Ticket Digital Barbershop Style */}
      <div className="relative bg-slate-950 border border-slate-800 rounded-2xl p-6 text-left shadow-inner overflow-hidden">
        {/* Adornos de ticket (muescas laterales) */}
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-900 border-r border-slate-800" />
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-900 border-l border-slate-800" />

        {/* Cabecera del ticket: Código */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-dashed border-slate-800 pb-4 mb-4 gap-2">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Código de Reserva
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-mono font-black text-red-500 tracking-wider">
                {appointment.code}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                title="Copiar código"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="text-right sm:text-right text-xs">
            <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-semibold">
              Estado: Confirmada
            </span>
          </div>
        </div>

        {/* Detalles del ticket */}
        <div className="space-y-3 text-xs sm:text-sm">
          <div className="flex items-start gap-2.5 text-slate-200">
            <User className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <span className="text-slate-400 text-xs block">Barbero Asignado:</span>
              <span className="font-bold text-white text-base">
                {appointment.barber?.name || 'Barbero Especialista'}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-slate-200">
            <Calendar className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <span className="text-slate-400 text-xs block">Fecha de la Cita:</span>
              <span className="font-semibold text-slate-100 capitalize">{formattedDate}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-slate-200">
            <Clock className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <span className="text-slate-400 text-xs block">Horario Reservado:</span>
              <span className="font-mono font-bold text-white">
                {appointment.startTime} - {appointment.endTime} hrs
              </span>
              <span className="text-slate-400 text-xs block">
                (45 min de atención personalizada + 15 min de preparación)
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-slate-200 pt-1 border-t border-slate-900">
            <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-slate-400 text-xs block">Cliente:</span>
              <span className="text-slate-300">
                {appointment.clientName} ({appointment.clientPhone})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Botones de Integración: WhatsApp y Calendarios */}
      <div className="space-y-2.5 pt-1">
        <p className="text-xs text-slate-400">Acceso rápido y sincronización:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Botón WhatsApp */}
          <a
            href={getWhatsAppShareUrl(appointment)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-600/20"
          >
            <Share2 className="w-4 h-4" />
            <span>Compartir por WhatsApp</span>
          </a>

          {/* Botón Google Calendar */}
          <a
            href={generateGoogleCalendarUrl(appointment)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-slate-700"
          >
            <CalendarPlus className="w-4 h-4 text-red-400" />
            <span>Google Calendar</span>
          </a>
        </div>

        {/* Descargar .ICS */}
        <button
          type="button"
          onClick={() => downloadIcsFile(appointment)}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800/80 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-slate-800"
        >
          <Download className="w-4 h-4" />
          <span>Descargar recordatorio de calendario (.ics)</span>
        </button>
      </div>

      {/* Botones de Navegación */}
      <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-800">
        <button
          type="button"
          onClick={onNewBooking}
          className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-slate-400" />
          <span>Agendar otra cita</span>
        </button>
        <button
          type="button"
          onClick={() => onViewInMyAppointments(appointment.code)}
          className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-600/20"
        >
          <span>Gestionar en Mis Citas</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
