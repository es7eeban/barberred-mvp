export type AppointmentStatus =
  | 'CONFIRMED'
  | 'CANCELLED_CLIENT'
  | 'CANCELLED_ADMIN'
  | 'COMPLETED'
  | 'NO_SHOW';

export interface Barber {
  id: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
}

export interface SlotInfo {
  time: string;
  available: boolean;
  reason?: 'booked' | 'blocked' | 'past';
}

export interface AvailabilityResponse {
  barberId: string;
  date: string;
  dayOfWeek: number;
  isOpen: boolean;
  message?: string;
  workingHours?: {
    startHour: number;
    endHour: number;
  };
  availableSlots?: string[];
  allSlots?: SlotInfo[];
}

export interface Appointment {
  id: string;
  code: string;
  barberId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  cancelReason?: string | null;
  createdAt: string;
  barber?: {
    id?: string;
    name: string;
    phone?: string | null;
    avatarUrl?: string | null;
  };
}
