import type { FC } from 'react';
import type { AppointmentStatus } from '../../types/index.js';
import { CheckCircle2, XCircle, AlertTriangle, Clock, UserX } from 'lucide-react';

interface StatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'CONFIRMED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-700/60 ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Confirmada
        </span>
      );
    case 'CANCELLED_CLIENT':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-950/60 text-red-400 border border-red-800/60 ${className}`}
        >
          <XCircle className="w-3.5 h-3.5" />
          Cancelada por ti
        </span>
      );
    case 'CANCELLED_ADMIN':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-400 border border-amber-800/60 ${className}`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Cancelada por Local
        </span>
      );
    case 'COMPLETED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/60 text-blue-400 border border-blue-800/60 ${className}`}
        >
          <Clock className="w-3.5 h-3.5" />
          Completada
        </span>
      );
    case 'NO_SHOW':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 ${className}`}
        >
          <UserX className="w-3.5 h-3.5" />
          No Asistió
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 ${className}`}
        >
          {status}
        </span>
      );
  }
};
