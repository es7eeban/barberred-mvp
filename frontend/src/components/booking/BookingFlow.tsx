import { useState, useEffect, useCallback, type FC } from 'react';
import type { Barber, SlotInfo, Appointment } from '../../types/index.js';
import { BarberCard } from './BarberCard.js';
import { DatePicker } from './DatePicker.js';
import { SlotButton } from './SlotButton.js';
import { DigitalTicket } from './DigitalTicket.js';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface BookingFlowProps {
  onNavigateToMyAppointments: (code: string) => void;
}

export const BookingFlow: FC<BookingFlowProps> = ({ onNavigateToMyAppointments }) => {
  // Barberos y selección
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);

  // Fecha seleccionada
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    // Si hoy es domingo (0), sugerir el lunes siguiente
    if (today.getDay() === 0) {
      today.setDate(today.getDate() + 1);
    }
    return today.toISOString().split('T')[0];
  });

  // Slots de disponibilidad
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [slotsMessage, setSlotsMessage] = useState<string | null>(null);

  // Formulario Guest Checkout
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('+56 9 ');
  const [clientEmail, setClientEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Cita confirmada (Ticket digital)
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  // Cargar barberos al iniciar
  useEffect(() => {
    fetch('/api/barbers')
      .then((res) => res.json())
      .then((data: Barber[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setBarbers(data);
          setSelectedBarber(data[0]);
        }
      })
      .catch((err) => console.error('Error al cargar barberos:', err));
  }, []);

  // Cargar disponibilidad cuando cambia el barbero o la fecha
  const fetchAvailability = useCallback(async () => {
    if (!selectedBarber || !selectedDate) return;
    setLoadingSlots(true);
    setSlotsMessage(null);
    setSelectedSlot(null);

    try {
      const res = await fetch(`/api/availability?barberId=${selectedBarber.id}&date=${selectedDate}`);
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
  }, [selectedBarber, selectedDate]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Enviar formulario de agendamiento
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarber || !selectedDate || !selectedSlot) return;

    // Validación básica de teléfono móvil
    const cleanPhone = clientPhone.replace(/\s+/g, '');
    if (cleanPhone.length < 8) {
      setBookingError('Por favor ingresa un número de teléfono móvil válido para confirmar tu cita.');
      return;
    }

    setSubmitting(true);
    setBookingError(null);

    try {
      const payload = {
        barberId: selectedBarber.id,
        date: selectedDate,
        startTime: selectedSlot,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim() || undefined,
      };

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setBookingError(data.message || 'Error al agendar la hora.');
        // Si falló por conflicto, refrescar disponibilidad
        fetchAvailability();
      } else {
        setConfirmedAppointment(data);
        fetchAvailability();
      }
    } catch {
      setBookingError('Error de conexión con el servidor al intentar reservar.');
    } finally {
      setSubmitting(false);
    }
  };

  // Si ya se confirmó la reserva, renderizar el Ticket Digital
  if (confirmedAppointment) {
    return (
      <DigitalTicket
        appointment={confirmedAppointment}
        onNewBooking={() => {
          setConfirmedAppointment(null);
          setSelectedSlot(null);
          setClientName('');
        }}
        onViewInMyAppointments={(code) => {
          onNavigateToMyAppointments(code);
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Banner de Bienvenida */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Reserva tu turno en <span className="text-red-500">BarberRed</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Turnos exactos de 60 minutos (45 min de corte + 15 min de buffer). Sin crear cuenta ni contraseñas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Pasos 1, 2 y 3 */}
        <div className="lg:col-span-7 space-y-6">
          {/* Paso 1: Seleccionar Barbero */}
          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 text-sm font-bold text-slate-200">
              <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-black shadow-md shadow-red-600/30">
                1
              </span>
              <span>Selecciona a tu Barbero</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {barbers.map((b) => (
                <BarberCard
                  key={b.id}
                  barber={b}
                  isSelected={selectedBarber?.id === b.id}
                  onSelect={setSelectedBarber}
                />
              ))}
            </div>
          </section>

          {/* Paso 2: Seleccionar Fecha */}
          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-sm font-bold text-slate-200">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-black shadow-md shadow-red-600/30">
                  2
                </span>
                <span>Selecciona el Día</span>
              </div>
              <CalendarIcon className="w-4 h-4 text-slate-400" />
            </div>

            <DatePicker selectedDate={selectedDate} onDateChange={setSelectedDate} />
          </section>

          {/* Paso 3: Selector de Slots */}
          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-sm font-bold text-slate-200">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-black shadow-md shadow-red-600/30">
                  3
                </span>
                <span>Horarios en Punto Disponibles</span>
              </div>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>

            {loadingSlots ? (
              <div className="flex items-center justify-center py-10 text-slate-400 gap-2.5 text-xs">
                <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                <span>Consultando agenda en tiempo real...</span>
              </div>
            ) : slotsMessage ? (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                {slotsMessage}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
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

            {selectedSlot && (
              <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Horario escogido: <strong className="font-mono">{selectedSlot} hrs</strong> (Atención: 45 min + 15 min buffer).
                </span>
              </p>
            )}
          </section>
        </div>

        {/* Columna Derecha: Paso 4 - Formulario Guest Checkout */}
        <div className="lg:col-span-5">
          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 sticky top-24">
            <div className="flex items-center gap-2.5 text-sm font-bold text-slate-200">
              <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-black shadow-md shadow-red-600/30">
                4
              </span>
              <span>Tus Datos de Contacto</span>
            </div>

            {/* Resumen del agendamiento */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Barbero:</span>
                <span className="text-white font-bold">{selectedBarber?.name || 'No seleccionado'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Fecha:</span>
                <span className="text-slate-200 font-semibold">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-900 pt-2">
                <span className="text-slate-400">Horario:</span>
                <span className="text-red-400 font-mono font-bold">
                  {selectedSlot ? `${selectedSlot} hrs` : 'Selecciona una hora'}
                </span>
              </div>
            </div>

            {bookingError && (
              <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/80 text-red-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tu Nombre Completo *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Martín González"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Teléfono Móvil (WhatsApp) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    required
                    placeholder="+56 9 1234 5678"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Te enviaremos la confirmación y recordatorio a este WhatsApp.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Correo Electrónico (opcional)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!selectedSlot || submitting}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 ${
                  !selectedSlot || submitting
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-600/30'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Confirmando tu Cita...</span>
                  </>
                ) : (
                  <>
                    <span>Confirmar Cita</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-[11px] text-slate-500 text-center">
                🔒 Sin registros previos ni pagos en línea. Pagas en el local al atenderte.
              </p>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};
