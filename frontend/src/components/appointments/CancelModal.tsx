import { useState, type FC } from 'react';
import type { Appointment } from '../../types/index.js';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

interface CancelModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (code: string) => void;
}

export const CancelModal: FC<CancelModalProps> = ({
  appointment,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState('Cancelada voluntariamente por el cliente.');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !appointment) return null;

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/appointments/${appointment.code}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'No fue posible cancelar la cita.');
      } else {
        onSuccess(appointment.code);
        onClose();
      }
    } catch {
      setError('Error de red al conectar con el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-red-500 font-bold">
            <AlertTriangle className="w-5 h-5" />
            <span>Cancelar Cita {appointment.code}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300">
          ¿Estás seguro de que deseas cancelar tu turno para el día{' '}
          <strong className="text-white">
            {new Date(appointment.date).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
          </strong>{' '}
          a las <strong className="text-white">{appointment.startTime} hrs</strong> con{' '}
          <strong className="text-white">{appointment.barber?.name}</strong>?
        </p>

        <p className="text-[11px] text-amber-400/90 bg-amber-950/30 border border-amber-900/40 p-2.5 rounded-xl">
          ⚠️ El horario quedará libre de inmediato para que otros clientes puedan agendar.
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/80 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleCancel} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Motivo de la cancelación (opcional):
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Imprevisto personal de trabajo"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Cancelando...</span>
                </>
              ) : (
                <span>Confirmar Cancelación</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
