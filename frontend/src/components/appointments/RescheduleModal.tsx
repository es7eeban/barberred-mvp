import { useState, useEffect, useCallback, type FC } from 'react';
import type { Appointment, SlotInfo } from '../../types/index.js';
import { DatePicker } from '../booking/DatePicker.js';
import { SlotButton } from '../booking/SlotButton.js';
import { X, Calendar, Clock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface RescheduleModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Appointment) => void;
}

export const RescheduleModal: FC<RescheduleModalProps> = ({
  appointment,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [newDate, setNewDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsMessage, setSlotsMessage] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializar fecha cuando se abre el modal
  useEffect(() => {
    if (appointment && isOpen) {
      setError(null);
      setSelectedSlot(null);
      // Sugerir la misma fecha o el día siguiente
      const apptDate = appointment.date.split('T')[0];
      setNewDate(apptDate);
    }
  }, [appointment, isOpen]);

  // Cargar disponibilidad para el barbero en la nueva fecha
  const fetchAvailability = useCallback(async () => {
    if (!appointment || !isOpen || !newDate) return;
    setLoadingSlots(true);
    setSlotsMessage(null);
    setSelectedSlot(null);

    try {
      const res = await fetch(`/api/availability?barberId=${appointment.barberId}&date=${newDate}`);
      const data = await res.json();

      if (!res.ok) {
        setSlotsMessage(data.message || 'Error al consultar disponibilidad');
        setSlots([]);
      } else {
        if (!data.isOpen) {
          setSlotsMessage(data.message || 'El barbero no atiende en la fecha seleccionada.');
          setSlots([]);
        } else {
          setSlots(data.allSlots || []);
          if (data.availableSlots && data.availableSlots.length === 0) {
            setSlotsMessage('No hay horas disponibles para este día.');
          }
        }
      }
    } catch {
      setSlotsMessage('No fue posible conectar con el servidor.');
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [appointment, isOpen, newDate]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  if (!isOpen || !appointment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/appointments/${appointment.code}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newDate,
          newStartTime: selectedSlot,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'No fue posible reprogramar la cita.');
      } else {
        onSuccess(data);
        onClose();
      }
    } catch {
      setError('Error de conexión al intentar reprogramar la cita.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-red-500" />
              <span>Reprogramar Cita {appointment.code}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Barbero: <strong className="text-slate-200">{appointment.barber?.name || 'Asignado'}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen actual */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex justify-between items-center">
          <div>
            <span className="text-slate-400 block">Horario actual:</span>
            <span className="font-semibold text-slate-200">
              {new Date(appointment.date).toLocaleDateString('es-ES', { timeZone: 'UTC' })} a las{' '}
              {appointment.startTime} hrs
            </span>
          </div>
          <span className="text-[11px] text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2 py-1 rounded-lg">
            Mínimo 2h de anticipación
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/80 text-red-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Paso 1: Seleccionar nueva fecha */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-200">1. Elige la nueva fecha:</label>
            <DatePicker selectedDate={newDate} onDateChange={setNewDate} />
          </div>

          {/* Paso 2: Seleccionar nuevo horario */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-200 flex items-center justify-between">
              <span>2. Selecciona el nuevo horario en punto:</span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </label>

            {loadingSlots ? (
              <div className="flex items-center justify-center py-6 text-slate-400 gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                <span>Consultando disponibilidad...</span>
              </div>
            ) : slotsMessage ? (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
                {slotsMessage}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.map((s) => (
                  <SlotButton
                    key={s.time}
                    time={s.time}
                    available={s.available}
                    isSelected={selectedSlot === s.time}
                    reason={s.reason}
                    onClick={() => setSelectedSlot(s.time)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!selectedSlot || submitting}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
                !selectedSlot || submitting
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Actualizando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Cambio</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
