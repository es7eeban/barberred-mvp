import { useState, useEffect, type FC, type FormEvent } from 'react';
import type { Barber } from '../../types/index.js';
import { DatePicker } from '../booking/DatePicker.js';
import { X, ShieldAlert, Loader2, Users, Sparkles } from 'lucide-react';

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
  const [barberId, setBarberId] = useState(defaultBarberId || 'ALL');
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [isFullDay, setIsFullDay] = useState(!defaultStartTime);
  const [startTime, setStartTime] = useState(defaultStartTime || '14:00');
  const [reason, setReason] = useState('Feriado / Cierre de local');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBarberId(defaultBarberId || 'ALL');
      if (defaultDate) setDate(defaultDate);
      if (defaultStartTime) {
        setStartTime(defaultStartTime);
        setIsFullDay(false);
        setReason('Almuerzo / Descanso');
      } else {
        setIsFullDay(true);
        setReason('Feriado / Cierre de local');
      }
      setError(null);
    }
  }, [isOpen, defaultBarberId, defaultDate, defaultStartTime]);

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

  const quickReasons = [
    'Feriado / Cierre de local',
    'Almuerzo / Descanso',
    'Mantención del local',
    'Capacitación de staff',
    'Trámite o urgencia personal',
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
          {/* Selección de Barbero con opción 'ALL' */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              ¿A quién aplica el bloqueo? *
            </label>
            <select
              value={barberId}
              onChange={(e) => setBarberId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-semibold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL" className="font-bold text-amber-400 bg-slate-900">
                ⭐ TODOS LOS BARBEROS (Cierre general / Feriado)
              </option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id} className="bg-slate-950 text-white">
                  Solo {b.name}
                </option>
              ))}
            </select>

            {barberId === 'ALL' && (
              <div className="mt-2 p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300/90 flex items-start gap-2">
                <Users className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Bloqueo masivo:</strong> Este bloqueo se aplicará automáticamente a{' '}
                  <strong className="text-white">todos los barberos activos</strong> al mismo tiempo.
                </span>
              </div>
            )}
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Fecha del Bloqueo *</label>
            <DatePicker selectedDate={date} onDateChange={setDate} />
          </div>

          {/* Tipo de Bloqueo */}
          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <label className="font-semibold text-slate-300 block">Alcance del bloqueo:</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="radio"
                  name="blockType"
                  checked={isFullDay}
                  onChange={() => setIsFullDay(true)}
                  className="accent-amber-600"
                />
                <span className="font-bold">Día completo (Feriado / Sin atención)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="radio"
                  name="blockType"
                  checked={!isFullDay}
                  onChange={() => setIsFullDay(false)}
                  className="accent-amber-600"
                />
                <span>Franja puntual (1 hora)</span>
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              >
                {hoursOptions.map((h) => (
                  <option key={h} value={h}>
                    {h} hrs
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Motivo con sugerencias rápidas */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Motivo o Etiqueta visible:
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Feriado Nacional / Cierre de Local"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />

            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickReasons.map((qr) => (
                <button
                  key={qr}
                  type="button"
                  onClick={() => setReason(qr)}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors ${
                    reason === qr
                      ? 'bg-amber-950 text-amber-300 border-amber-700'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {qr}
                </button>
              ))}
            </div>
          </div>

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
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Aplicando bloqueo...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {barberId === 'ALL'
                      ? 'Bloquear para Todos los Barberos'
                      : 'Aplicar Bloqueo'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
