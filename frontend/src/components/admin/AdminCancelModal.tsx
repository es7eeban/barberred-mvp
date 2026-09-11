import { useState, type FC, type FormEvent } from 'react';
import type { Appointment } from '../../types/index.js';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

interface AdminCancelModalProps {
  appointment: Appointment | null;
  token: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedAppointment: Appointment) => void;
}

export const AdminCancelModal: FC<AdminCancelModalProps> = ({
  appointment,
  token,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !appointment) return null;

  const handleCancel = async (e: FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('El motivo de la cancelación administrativa es obligatorio.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/appointments/${appointment.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'No fue posible cancelar la cita.');
      } else {
        onSuccess(data);
        onClose();
      }
    } catch {
      setError('Error al comunicar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-red-500 font-bold">
            <AlertTriangle className="w-5 h-5" />
            <span>Cancelación Administrativa</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1 text-xs">
          <p className="text-white font-bold">
            Cita {appointment.code} &bull; {appointment.clientName}
          </p>
          <p className="text-slate-400">
            {new Date(appointment.date).toLocaleDateString('es-ES', { timeZone: 'UTC' })} a las{' '}
            {appointment.startTime} hrs con {appointment.barber?.name}
          </p>
          <p className="text-slate-500">Tel: {appointment.clientPhone}</p>
        </div>

        <p className="text-xs text-amber-400/90 bg-amber-950/30 border border-amber-900/40 p-3 rounded-2xl">
          ⚠️ El estado cambiará a <strong className="text-amber-300">CANCELADA_ADMIN</strong>, el horario quedará libre y se registrará el motivo en auditoría.
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/80 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleCancel} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Motivo justificado de la cancelación *
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Barbero con licencia médica de emergencia / Cierre por corte de luz"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
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
