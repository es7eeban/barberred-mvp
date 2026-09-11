import { useState, useEffect, type FC, type FormEvent } from 'react';
import type { Barber } from '../../types/index.js';
import { DatePicker } from '../booking/DatePicker.js';
import { X, ShieldAlert, Loader2 } from 'lucide-react';

interface CreateBlockModalProps {
  barbers: Barber[];
  defaultBarberId?: string;
  defaultDate?: string;
  defaultStartTime?: string;
  token: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateBlockModal: FC<CreateBlockModalProps> = ({
  barbers,
  defaultBarberId,
  defaultDate,
  defaultStartTime,
  token,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [barberId, setBarberId] = useState(defaultBarberId || '');
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [isFullDay, setIsFullDay] = useState(!defaultStartTime);
  const [startTime, setStartTime] = useState(defaultStartTime || '14:00');
  const [reason, setReason] = useState('Almuerzo / Descanso');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (defaultBarberId) setBarberId(defaultBarberId);
      else if (barbers.length > 0) setBarberId(barbers[0].id);

      if (defaultDate) setDate(defaultDate);
      if (defaultStartTime) {
        setStartTime(defaultStartTime);
        setIsFullDay(false);
      }
      setError(null);
    }
  }, [isOpen, defaultBarberId, defaultDate, defaultStartTime, barbers]);

  if (!isOpen) return null;

  const hoursOptions = [
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/schedule-blocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          barberId,
          date,
          isFullDay,
          startTime: isFullDay ? undefined : startTime,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'No fue posible crear el bloqueo.');
      } else {
        onSuccess();
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
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-amber-500 font-bold">
            <ShieldAlert className="w-5 h-5" />
            <span>Bloquear Horario o Día</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/80 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Barbero */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Barbero *</label>
            <select
              value={barberId}
              onChange={(e) => setBarberId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
            >
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Fecha del Bloqueo *</label>
            <DatePicker selectedDate={date} onDateChange={setDate} />
          </div>

          {/* Tipo de Bloqueo */}
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <label className="font-semibold text-slate-300 block">Tipo de Bloqueo:</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="radio"
                  name="blockType"
                  checked={!isFullDay}
                  onChange={() => setIsFullDay(false)}
                  className="accent-red-600"
                />
                <span>Franja horaria puntual (1 hora)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="radio"
                  name="blockType"
                  checked={isFullDay}
                  onChange={() => setIsFullDay(true)}
                  className="accent-red-600"
                />
                <span>Día completo (Feriado/Ausencia)</span>
              </label>
            </div>
          </div>

          {!isFullDay && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Hora a bloquear en punto:
              </label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-red-500"
              >
                {hoursOptions.map((h) => (
                  <option key={h} value={h}>
                    {h} hrs
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Motivo */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Motivo o Etiqueta (opcional):
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Almuerzo, Trámite personal, Feriado"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Aplicar Bloqueo</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
