import { useState, type FC } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  className?: string;
}

export const DatePicker: FC<DatePickerProps> = ({ selectedDate, onDateChange, className = '' }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Máximo 30 días en el futuro (RN-04)
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 30);

  // Mes visible en el calendario interactivo
  const [viewDate, setViewDate] = useState<Date>(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, d || 1);
  });

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  // Nombre del mes en español
  const monthName = viewDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  // Días del mes
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Lunes = 0, Domingo = 6

  // Navegación de mes
  const canGoPrev =
    viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  const canGoNext =
    viewYear < maxDate.getFullYear() ||
    (viewYear === maxDate.getFullYear() && viewMonth < maxDate.getMonth());

  const handlePrevMonth = () => {
    if (!canGoPrev) return;
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = () => {
    if (!canGoNext) return;
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  // Botones de acceso rápido (Próximos 4 días)
  const quickDays = [0, 1, 2, 3].map((offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const dateStr = d.toISOString().split('T')[0];
    const isToday = offset === 0;
    const isTomorrow = offset === 1;

    const label = isToday ? 'Hoy' : isTomorrow ? 'Mañana' : d.toLocaleDateString('es-ES', { weekday: 'short' });
    const dayNumber = d.getDate();
    const monthShort = d.toLocaleDateString('es-ES', { month: 'short' });

    return { dateStr, label, dayNumber, monthShort };
  });

  const weekdays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Accesos Rápidos de Días */}
      <div>
        <span className="text-[11px] font-semibold text-slate-400 block mb-2 px-1">
          Días más solicitados:
        </span>
        <div className="grid grid-cols-4 gap-2">
          {quickDays.map((q) => {
            const isSelected = selectedDate === q.dateStr;
            return (
              <button
                key={q.dateStr}
                type="button"
                onClick={() => {
                  onDateChange(q.dateStr);
                  const [y, m, d] = q.dateStr.split('-').map(Number);
                  setViewDate(new Date(y, m - 1, d));
                }}
                className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center min-h-[56px] focus:outline-none focus:ring-2 focus:ring-red-500/40 ${
                  isSelected
                    ? 'border-red-500 bg-red-950/40 text-white shadow-md shadow-red-600/20 ring-1 ring-red-500'
                    : 'border-slate-800 bg-slate-950/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <span
                  className={`text-[11px] font-semibold capitalize ${
                    isSelected ? 'text-red-400' : 'text-slate-400'
                  }`}
                >
                  {q.label}
                </span>
                <span className="text-sm font-black mt-0.5">
                  {q.dayNumber} {q.monthShort}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Calendario Interactivo Mensual Completo */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-inner space-y-3">
        {/* Cabecera del Mes con Flechas Prev / Next */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-2.5 px-1">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-red-500" />
            <span className="text-xs sm:text-sm font-bold text-white capitalize tracking-wide">
              {monthName}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!canGoPrev}
              onClick={handlePrevMonth}
              title="Mes anterior"
              className={`p-1.5 rounded-xl border transition-colors ${
                canGoPrev
                  ? 'border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-300'
                  : 'border-transparent text-slate-700 cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={!canGoNext}
              onClick={handleNextMonth}
              title="Mes siguiente"
              className={`p-1.5 rounded-xl border transition-colors ${
                canGoNext
                  ? 'border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-300'
                  : 'border-transparent text-slate-700 cursor-not-allowed'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Encabezados de días de la semana */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {weekdays.map((w, idx) => (
            <span
              key={w}
              className={`text-[10px] font-bold uppercase tracking-wider py-1 ${
                idx === 6 ? 'text-red-400/80' : 'text-slate-500'
              }`}
            >
              {w}
            </span>
          ))}
        </div>

        {/* Grilla de Días del Mes */}
        <div className="grid grid-cols-7 gap-1">
          {/* Celdas vacías previas al día 1 */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-9" />
          ))}

          {/* Días del mes */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dayDate = new Date(viewYear, viewMonth, dayNum);
            dayDate.setHours(0, 0, 0, 0);

            // Formato YYYY-MM-DD
            const yyyy = dayDate.getFullYear();
            const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
            const dd = String(dayDate.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;

            const isPast = dayDate < today;
            const isBeyondMax = dayDate > maxDate;
            const isSunday = dayDate.getDay() === 0; // Domingo
            const isDisabled = isPast || isBeyondMax;
            const isSelected = selectedDate === dateStr;
            const isTodayDay = dayDate.getTime() === today.getTime();

            return (
              <button
                key={dateStr}
                type="button"
                disabled={isDisabled}
                onClick={() => onDateChange(dateStr)}
                className={`h-9 rounded-xl text-xs font-mono font-bold flex flex-col items-center justify-center transition-all relative ${
                  isDisabled
                    ? 'text-slate-700 line-through cursor-not-allowed opacity-40'
                    : isSelected
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30 scale-105 ring-2 ring-red-400 z-10'
                    : isSunday
                    ? 'text-red-400/90 hover:bg-slate-900 border border-transparent hover:border-slate-800'
                    : 'text-slate-200 hover:bg-slate-900 hover:border-slate-700 border border-transparent'
                }`}
              >
                <span>{dayNum}</span>
                {isTodayDay && !isSelected && (
                  <span className="w-1 h-1 rounded-full bg-red-500 absolute bottom-1" />
                )}
              </button>
            );
          })}
        </div>

        {/* Resumen de la fecha seleccionada */}
        <div className="pt-2 border-t border-slate-900/80 flex items-center justify-between text-xs px-1">
          <span className="text-slate-400">Día seleccionado:</span>
          <span className="font-bold text-slate-100 capitalize">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>
    </div>
  );
};
