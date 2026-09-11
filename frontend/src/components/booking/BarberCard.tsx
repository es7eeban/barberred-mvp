import type { FC } from 'react';
import type { Barber } from '../../types/index.js';
import { Scissors, Check } from 'lucide-react';

interface BarberCardProps {
  barber: Barber;
  isSelected: boolean;
  onSelect: (barber: Barber) => void;
}

export const BarberCard: FC<BarberCardProps> = ({ barber, isSelected, onSelect }) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(barber)}
      className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-center gap-3.5 focus:outline-none focus:ring-2 focus:ring-red-500/50 min-h-[64px] ${
        isSelected
          ? 'border-red-500 bg-red-950/20 shadow-lg shadow-red-600/10 ring-1 ring-red-500'
          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/40'
      }`}
    >
      <div className="relative shrink-0">
        {barber.avatarUrl ? (
          <img
            src={barber.avatarUrl}
            alt={barber.name}
            className="w-12 h-12 rounded-full object-cover border border-slate-700 shadow-md"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
            <Scissors className="w-5 h-5" />
          </div>
        )}
        {isSelected && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md">
            <Check className="w-3 h-3 stroke-[3]" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-100 truncate">{barber.name}</p>
        <p className="text-xs text-slate-400 truncate">Especialista en cortes & barba</p>
      </div>
    </button>
  );
};
