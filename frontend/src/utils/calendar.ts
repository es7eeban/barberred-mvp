import type { Appointment } from '../types/index.js';

/**
 * Parsea la fecha y hora de la cita a un objeto Date local / UTC consistente.
 */
export function getAppointmentDateTime(dateStr: string, timeStr: string): Date {
  const cleanDate = dateStr.split('T')[0];
  const [year, month, day] = cleanDate.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  // Asumimos hora local de la barbería
  return new Date(year, month - 1, day, hour, minute, 0);
}

/**
 * Formatea una fecha a formato ICS (YYYYMMDDTHHmmss)
 */
function formatDateToIcs(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}${m}${d}T${hh}${mm}${ss}`;
}

/**
 * Genera el enlace para añadir el evento directamente a Google Calendar.
 */
export function generateGoogleCalendarUrl(appointment: Appointment): string {
  const start = getAppointmentDateTime(appointment.date, appointment.startTime);
  const end = getAppointmentDateTime(appointment.date, appointment.endTime);

  const startFormatted = formatDateToIcs(start);
  const endFormatted = formatDateToIcs(end);

  const title = encodeURIComponent(`💈 BarberRed: Cita con ${appointment.barber?.name || 'Barbero'}`);
  const details = encodeURIComponent(
    `Cita confirmada en BarberRed.\n` +
      `Código de Reserva: ${appointment.code}\n` +
      `Barbero: ${appointment.barber?.name || 'Asignado'}\n` +
      `Horario: ${appointment.startTime} - ${appointment.endTime}\n` +
      `Cliente: ${appointment.clientName}\n\n` +
      `Para gestionar tu cita visita: ${window.location.origin}/mis-citas?code=${appointment.code}`,
  );
  const location = encodeURIComponent('BarberRed Local Principal');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startFormatted}/${endFormatted}&details=${details}&location=${location}`;
}

/**
 * Genera y descarga un archivo .ics estándar para importar en Apple Calendar, Outlook, etc.
 */
export function downloadIcsFile(appointment: Appointment): void {
  const start = getAppointmentDateTime(appointment.date, appointment.startTime);
  const end = getAppointmentDateTime(appointment.date, appointment.endTime);

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BarberRed//Booking System//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:barberred-${appointment.code}-${Date.now()}@barberred.com`,
    `DTSTAMP:${formatDateToIcs(new Date())}`,
    `DTSTART:${formatDateToIcs(start)}`,
    `DTEND:${formatDateToIcs(end)}`,
    `SUMMARY:💈 BarberRed: Cita con ${appointment.barber?.name || 'Barbero'}`,
    `DESCRIPTION:Cita confirmada en BarberRed.\\nCódigo de Reserva: ${appointment.code}\\nBarbero: ${appointment.barber?.name || 'Asignado'}\\nHorario: ${appointment.startTime} - ${appointment.endTime}`,
    'LOCATION:BarberRed Local Principal',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `BarberRed-${appointment.code}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Genera el link de WhatsApp para compartir el detalle de la reserva o contactar a la barbería.
 */
export function getWhatsAppShareUrl(appointment: Appointment): string {
  const dateFormatted = new Date(appointment.date).toLocaleDateString('es-ES', {
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const text = encodeURIComponent(
    `¡Hola! 💈 Tengo una cita agendada en *BarberRed*:\n\n` +
      `🔖 *Código:* ${appointment.code}\n` +
      `✂️ *Barbero:* ${appointment.barber?.name || 'Asignado'}\n` +
      `📅 *Fecha:* ${dateFormatted}\n` +
      `⏰ *Hora:* ${appointment.startTime} a ${appointment.endTime}\n` +
      `👤 *Cliente:* ${appointment.clientName}\n\n` +
      `Gestión de tu cita: ${window.location.origin}/mis-citas?code=${appointment.code}`,
  );

  return `https://wa.me/?text=${text}`;
}

/**
 * Verifica si una cita puede modificarse o cancelarse respetando la regla de 2 horas.
 */
export function canModifyOrCancel(dateStr: string, startTime: string): {
  allowed: boolean;
  hoursRemaining: number;
  message?: string;
} {
  const cleanDate = dateStr.split('T')[0];
  const [year, month, day] = cleanDate.split('-').map(Number);
  const [hour, min] = startTime.split(':').map(Number);

  const apptDate = new Date(year, month - 1, day, hour, min || 0, 0);
  const now = new Date();

  const diffMs = apptDate.getTime() - now.getTime();
  const hoursRemaining = diffMs / (1000 * 60 * 60);

  if (hoursRemaining <= 0) {
    return {
      allowed: false,
      hoursRemaining: 0,
      message: 'Esta cita ya pasó o está en curso.',
    };
  }

  if (hoursRemaining < 2) {
    return {
      allowed: false,
      hoursRemaining: Math.round(hoursRemaining * 10) / 10,
      message:
        'Faltan menos de 2 horas para el turno. Para imprevistos de última hora, comunícate directamente con el local.',
    };
  }

  return {
    allowed: true,
    hoursRemaining: Math.round(hoursRemaining * 10) / 10,
  };
}
