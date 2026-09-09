import React, { useState, useEffect, useCallback } from 'react';
import {
  Scissors,
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowRight,
  XCircle,
  Loader2,
} from 'lucide-react';

interface Barber {
  id: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
}

interface SlotInfo {
  time: string;
  available: boolean;
  reason?: 'booked' | 'blocked' | 'past';
}

interface Appointment {
  id: string;
  code: string;
  barberId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  status: 'CONFIRMED' | 'CANCELLED_CLIENT' | 'CANCELLED_ADMIN' | 'COMPLETED' | 'NO_SHOW';
  cancelReason?: string | null;
  createdAt: string;
  barber?: {
    name: string;
    phone?: string | null;
    avatarUrl?: string | null;
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'booking' | 'my-appointments'>('booking');

  // Estado del flujo de agendamiento
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    // Si hoy es domingo (0), sugerir el lunes siguiente
    if (today.getDay() === 0) {
      today.setDate(today.getDate() + 1);
    }
    return today.toISOString().split('T')[0];
  });
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [slotsMessage, setSlotsMessage] = useState<string | null>(null);

  // Formulario del cliente
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('+56 9 ');
  const [clientEmail, setClientEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  // Estado de "Mis Citas"
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Appointment[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // 1. Cargar barberos al iniciar
  useEffect(() => {
    fetch('/api/barbers')
      .then((res) => res.json())
      .then((data: Barber[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setBarbers(data);
          setSelectedBarber(data[0]);
        }
      })
      .catch((err) => console.error('Error cargando barberos:', err));
  }, []);

  // 2. Cargar disponibilidad cuando cambia barbero o fecha
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

  // 3. Confirmar Reserva
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarber || !selectedDate || !selectedSlot) return;

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
      } else {
        setConfirmedAppointment(data);
        fetchAvailability();
      }
    } catch {
      setBookingError('Error de red al intentar confirmar la reserva.');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Buscar Citas
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setSearching(true);
    setSearchError(null);
    setActionSuccess(null);
    setSearchResults([]);

    try {
      if (query.toUpperCase().startsWith('BR-')) {
        const res = await fetch(`/api/appointments/${query.toUpperCase()}`);
        if (!res.ok) {
          setSearchError('No se encontró ninguna cita con ese código.');
        } else {
          const data = await res.json();
          setSearchResults([data]);
        }
      } else {
        const res = await fetch(`/api/appointments/lookup?phone=${encodeURIComponent(query)}`);
        if (!res.ok) {
          setSearchError('No se encontraron citas con ese teléfono.');
        } else {
          const data = await res.json();
          if (data.length === 0) {
            setSearchError('No tienes citas agendadas con ese número.');
          } else {
            setSearchResults(data);
          }
        }
      }
    } catch {
      setSearchError('Error al consultar citas.');
    } finally {
      setSearching(false);
    }
  };

  // 5. Cancelar Cita
  const handleCancelAppointment = async (code: string) => {
    if (!confirm(`¿Estás seguro de que deseas cancelar la cita ${code}?`)) return;

    try {
      const res = await fetch(`/api/appointments/${code}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelada por el cliente desde la web.' }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'No fue posible cancelar la cita.');
      } else {
        setActionSuccess(`Cita ${code} cancelada exitosamente.`);
        // Refrescar lista de búsqueda
        setSearchResults((prev) =>
          prev.map((app) => (app.code === code ? { ...app, status: 'CANCELLED_CLIENT' } : app)),
        );
        fetchAvailability();
      }
    } catch {
      alert('Error de conexión al cancelar la cita.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-red-600 selection:text-white">
      {/* Barra de Navegación Superior */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center shadow-lg shadow-red-600/20">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white">
                Barber<span className="text-red-500">Red</span>
              </span>
              <span className="ml-2 text-[10px] font-semibold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                MVP SDD
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('booking')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'booking'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Agendar Hora
            </button>
            <button
              onClick={() => setActiveTab('my-appointments')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'my-appointments'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Mis Citas
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'booking' && (
          <div className="space-y-8">
            {/* Banner Informativo */}
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Agenda tu atención en <span className="text-red-500">BarberRed</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-400">
                Turnos en horas fijas en punto (45 min de corte + 15 min de buffer). Sin crear cuenta ni contraseñas.
              </p>
            </div>

            {confirmedAppointment ? (
              /* Pantalla de Ticket Confirmado */
              <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">¡Cita Confirmada con Éxito!</h2>
                  <p className="text-sm text-slate-400 mt-1">Guarda tu código para consultar o gestionar tu reserva.</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 text-left space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <span className="text-xs text-slate-400">Código de Cita:</span>
                    <span className="text-lg font-mono font-black text-red-500">{confirmedAppointment.code}</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="text-slate-300 font-semibold">{confirmedAppointment.barber?.name}</p>
                    <p className="text-slate-400 text-xs">
                      📅 Fecha: {new Date(confirmedAppointment.date).toLocaleDateString('es-ES', { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <p className="text-slate-400 text-xs">
                      ⏰ Horario: <span className="text-white font-mono">{confirmedAppointment.startTime}</span> a{' '}
                      <span className="text-white font-mono">{confirmedAppointment.endTime}</span>
                    </p>
                    <p className="text-slate-400 text-xs">
                      👤 Cliente: {confirmedAppointment.clientName} ({confirmedAppointment.clientPhone})
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setConfirmedAppointment(null);
                      setSelectedSlot(null);
                      setClientName('');
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
                  >
                    Agendar otra cita
                  </button>
                  <button
                    onClick={() => {
                      setSearchQuery(confirmedAppointment.code);
                      setActiveTab('my-appointments');
                      setConfirmedAppointment(null);
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shadow-lg shadow-red-600/20"
                  >
                    Ver en Mis Citas
                  </button>
                </div>
              </div>
            ) : (
              /* Flujo de 4 Pasos */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Columna Izquierda: Selección de Barbero y Fecha */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Paso 1: Seleccionar Barbero */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                      <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs">
                        1
                      </span>
                      <span>Elige a tu Barbero</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {barbers.map((b) => (
                        <div
                          key={b.id}
                          onClick={() => setSelectedBarber(b)}
                          className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                            selectedBarber?.id === b.id
                              ? 'border-red-500 bg-red-950/20 shadow-md shadow-red-500/10'
                              : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                          }`}
                        >
                          <img
                            src={b.avatarUrl || 'https://via.placeholder.com/150'}
                            alt={b.name}
                            className="w-12 h-12 rounded-full object-cover border border-slate-700"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{b.name}</p>
                            <p className="text-xs text-slate-400">Atención personalizada</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Paso 2: Seleccionar Fecha */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                        <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs">
                          2
                        </span>
                        <span>Selecciona el Día</span>
                      </div>
                      <CalendarIcon className="w-4 h-4 text-slate-400" />
                    </div>

                    <input
                      type="date"
                      value={selectedDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>

                  {/* Paso 3: Selector de Slots */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                        <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs">
                          3
                        </span>
                        <span>Horarios en Punto Disponibles</span>
                      </div>
                      <Clock className="w-4 h-4 text-slate-400" />
                    </div>

                    {loadingSlots ? (
                      <div className="flex items-center justify-center py-8 text-slate-400 gap-2 text-sm">
                        <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                        <span>Consultando agenda...</span>
                      </div>
                    ) : slotsMessage ? (
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                        {slotsMessage}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                        {slots.map((s) => (
                          <button
                            key={s.time}
                            disabled={!s.available}
                            onClick={() => setSelectedSlot(s.time)}
                            className={`py-2.5 px-3 rounded-xl text-xs font-mono font-bold transition-all ${
                              !s.available
                                ? 'bg-slate-950 border border-slate-800/80 text-slate-600 line-through cursor-not-allowed'
                                : selectedSlot === s.time
                                ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/30 scale-105'
                                : 'bg-slate-950/80 border border-slate-800 text-slate-200 hover:border-red-500/50 hover:bg-slate-900'
                            }`}
                          >
                            {s.time}
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedSlot && (
                      <p className="text-xs text-emerald-400 font-medium">
                        ✓ Seleccionaste las <strong className="font-mono">{selectedSlot} hrs</strong> (Atención: 45 min + 15 min buffer).
                      </p>
                    )}
                  </div>
                </div>

                {/* Columna Derecha: Paso 4 - Formulario de Confirmación */}
                <div className="lg:col-span-5">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-5 sticky top-24">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                      <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs">
                        4
                      </span>
                      <span>Tus Datos de Contacto</span>
                    </div>

                    {/* Resumen previo */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Barbero:</span>
                        <span className="text-white font-semibold">{selectedBarber?.name || 'No seleccionado'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Fecha:</span>
                        <span className="text-white font-semibold">{selectedDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Hora:</span>
                        <span className="text-white font-mono font-bold">
                          {selectedSlot ? `${selectedSlot} hrs` : 'Selecciona una hora'}
                        </span>
                      </div>
                    </div>

                    {bookingError && (
                      <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/80 text-red-400 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{bookingError}</span>
                      </div>
                    )}

                    <form onSubmit={handleBookingSubmit} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Tu Nombre Completo *</label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                          <input
                            type="text"
                            required
                            placeholder="Ej. Juan Pérez"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Teléfono Celular (WhatsApp) *
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                          <input
                            type="tel"
                            required
                            placeholder="+56 9 8765 4321"
                            value={clientPhone}
                            onChange={(e) => setClientPhone(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Correo Electrónico (opcional)
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                          <input
                            type="email"
                            placeholder="juan@ejemplo.com"
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={!selectedSlot || submitting}
                        className={`w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                          !selectedSlot || submitting
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30'
                        }`}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Confirmando Cita...</span>
                          </>
                        ) : (
                          <>
                            <span>Confirmar Cita</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>

                      <p className="text-[11px] text-slate-500 text-center">
                        🔒 Sin registro previo. Puedes cancelar hasta 2h antes.
                      </p>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'my-appointments' && (
          /* Módulo "Mis Citas" */
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Gestiona tus Citas</h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Ingresa tu número de teléfono o código de reserva (ej. <code className="text-red-400 font-mono">BR-9647</code>) para consultar o cancelar.
              </p>
            </div>

            {/* Buscador */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  placeholder="Código BR-XXXX o Teléfono móvil"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-600/20"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Buscar</span>
              </button>
            </form>

            {actionSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {searchError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/80 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            {/* Listado de Resultados */}
            <div className="space-y-3">
              {searchResults.map((app) => (
                <div
                  key={app.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-red-500 text-base">{app.code}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          app.status === 'CONFIRMED'
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                            : 'bg-red-950/60 text-red-400 border-red-800'
                        }`}
                      >
                        {app.status === 'CONFIRMED' ? 'Confirmada' : 'Cancelada'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(app.date).toLocaleDateString('es-ES', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Barbero:</span>
                      <p className="font-semibold text-white">{app.barber?.name || 'Asignado'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Horario:</span>
                      <p className="font-mono font-semibold text-white">
                        {app.startTime} - {app.endTime}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Cliente:</span>
                      <p className="text-slate-300">{app.clientName}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Teléfono:</span>
                      <p className="text-slate-300">{app.clientPhone}</p>
                    </div>
                  </div>

                  {app.status === 'CONFIRMED' && (
                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        onClick={() => handleCancelAppointment(app.code)}
                        className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-800/80 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancelar Cita</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
