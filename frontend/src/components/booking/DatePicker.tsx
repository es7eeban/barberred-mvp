import type { FC } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

interface DatePickerProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  className?: string;
}

export const DatePicker: FC<DatePickerProps> = ({ selectedDate, onDateChange, className = '' }) => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Máximo 30 días en el futuro (RN-04)
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  // Quick dates generator (próximos 4 días hábiles / comunes)
  const quickDays = [0, 1, 2, 3].map((offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const dateStr = d.toISOString().split('T')[0];
    const isToday = offset === 0;
    const isTomorrow = offset === 1;

    let label = isToday ? 'Hoy' : isTomorrow ? 'Mañana' : d.toLocaleDateString('es-ES', { weekday: 'short' });
    const dayNumber = d.getDate();
    const monthShort = d.toLocaleDateString('es-ES', { month: 'short' });

    return {
      dateStr,
      label,
      dayNumber,
      monthShort,
    };
  });

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Botones de selección rápida de días */}
      <div className="grid grid-cols-4 gap-2">
        {quickDays.map((q) => {
          const isSelected = selectedDate === q.dateStr;
          return (
            <button
              key={q.dateStr}
              type="button"
              onClick={() => onDateChange(q.dateStr)}
              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center min-h-[56px] focus:outline-none focus:ring-2 focus:ring-red-500/40 ${
                isSelected
                  ? 'border-red-500 bg-red-950/30 text-white shadow-md shadow-red-600/10 ring-1 ring-red-500'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
              }`}
            >
              <span className={`text-[11px] font-medium capitalize ${isSelected ? 'text-red-400' : 'text-slate-400'}`}>
                {q.label}
              </span>
              <span className="text-sm font-bold mt-0.5">
                {q.dayNumber} {q.monthShort}
              </span>
            </button>
          );
        })}
      </div>

      {/* Input de fecha completa */}
      <div className="relative">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 px-1">
          <span>O selecciona otra fecha (hasta 30 días):</span>
          <span className="flex items-center gap-1 font-mono text-slate-300">
            <CalendarIcon className="w-3.5 h-3.5 text-red-500" />
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </span>
        </div>
        <div className="relative">
          <input
            type="date"
            value={selectedDate}
            min={todayStr}
            max={maxDateStr}
            onChange={(e) => {
              if (e.target.value) {
                onDateChange(e.target.value);
              }
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
