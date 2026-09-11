import type { FC } from 'react';

interface SlotButtonProps {
  time: string;
  available: boolean;
  isSelected: boolean;
  reason?: 'booked' | 'blocked' | 'past';
  onClick: () => void;
}

export const SlotButton: FC<SlotButtonProps> = ({
  time,
  available,
  isSelected,
  reason,
  onClick,
}) => {
  let subLabel = 'Disponible';
  if (!available) {
    if (reason === 'past') subLabel = 'Pasada';
    else if (reason === 'blocked') subLabel = 'No disponible';
    else subLabel = 'Ocupada';
  }

  return (
    <button
      type="button"
      disabled={!available}
      onClick={onClick}
      aria-label={`Hora ${time}, ${subLabel}`}
      className={`min-h-[52px] p-2.5 rounded-xl text-center font-mono transition-all flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-500/50 ${
        !available
          ? 'bg-slate-950/80 border border-slate-900 text-slate-600 line-through cursor-not-allowed opacity-50'
          : isSelected
          ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/30 scale-[1.02] ring-2 ring-red-400 font-bold'
          : 'bg-slate-900/90 border border-slate-800 text-slate-200 hover:border-red-500/50 hover:bg-slate-800/80 hover:text-white font-semibold'
      }`}
    >
      <span className="text-sm tracking-tight">{time}</span>
      <span
        className={`text-[9px] font-sans mt-0.5 uppercase tracking-wider ${
          isSelected ? 'text-red-100 font-bold' : available ? 'text-slate-400' : 'text-slate-600'
        }`}
      >
        {isSelected ? 'Elegida' : subLabel}
      </span>
    </button>
  );
};
