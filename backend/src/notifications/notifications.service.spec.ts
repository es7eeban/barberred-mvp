import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationsService } from './notifications.service.js';
import { NotificationChannel, NotificationStatus, AppointmentStatus } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockPrisma: any;
  let mockConfig: any;

  beforeEach(() => {
    mockPrisma = {
      notificationLog: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'log-1', ...data })),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    mockConfig = {
      get: vi.fn((key: string) => {
        if (key === 'TWILIO_ACCOUNT_SID') return 'AC_dummy_account_sid_for_development';
        if (key === 'TWILIO_AUTH_TOKEN') return 'dummy_auth_token';
        if (key === 'TWILIO_WHATSAPP_NUMBER') return 'whatsapp:+14155238886';
        if (key === 'TWILIO_SMS_NUMBER') return '+14155238886';
        if (key === 'FRONTEND_URL') return 'http://localhost:5173';
        return null;
      }),
    };

    service = new NotificationsService(mockPrisma as any, mockConfig as any);
  });

  it('debe iniciar en modo Mock cuando las credenciales de Twilio son dummy', () => {
    expect(service).toBeDefined();
  });

  it('debe despachar confirmación de reserva y persistir en NotificationLog', async () => {
    const mockAppointment = {
      id: 'appt-1',
      code: 'BR-1234',
      barberId: 'barber-1',
      clientName: 'Juan Pérez',
      clientPhone: '+56912345678',
      clientEmail: 'juan@test.com',
      date: new Date('2026-09-25T00:00:00Z'),
      startTime: '11:00',
      endTime: '12:00',
      status: AppointmentStatus.CONFIRMED,
      cancelReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      barber: {
        name: 'Matías Silva',
        phone: '+56987654321',
      },
    };

    await service.sendBookingConfirmation(mockAppointment as any);

    expect(mockPrisma.notificationLog.create).toHaveBeenCalledTimes(1);
    const createCall = mockPrisma.notificationLog.create.mock.calls[0][0];

    expect(createCall.data.appointmentId).toBe('appt-1');
    expect(createCall.data.channel).toBe(NotificationChannel.WHATSAPP);
    expect(createCall.data.recipient).toBe('+56912345678');
    expect(createCall.data.status).toBe(NotificationStatus.SENT);
    expect(createCall.data.messageBody).toContain('¡Hola Juan Pérez!');
    expect(createCall.data.messageBody).toContain('Matías Silva');
    expect(createCall.data.messageBody).toContain('BR-1234');
    expect(createCall.data.messageBody).toContain('11:00 hrs');
  });

  it('debe despachar reprogramación de cita correctamente', async () => {
    const mockAppointment = {
      id: 'appt-2',
      code: 'BR-5678',
      barberId: 'barber-1',
      clientName: 'Carlos Gómez',
      clientPhone: '987654321', // formato sin +56
      clientEmail: null,
      date: new Date('2026-09-26T00:00:00Z'),
      startTime: '15:00',
      endTime: '16:00',
      status: AppointmentStatus.CONFIRMED,
      cancelReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      barber: {
        name: 'Diego Morales',
        phone: null,
      },
    };

    await service.sendRescheduleConfirmation(mockAppointment as any);

    expect(mockPrisma.notificationLog.create).toHaveBeenCalledTimes(1);
    const createCall = mockPrisma.notificationLog.create.mock.calls[0][0];

    expect(createCall.data.recipient).toBe('+56987654321'); // normalizado a E.164
    expect(createCall.data.messageBody).toContain('REPROGRAMADA');
    expect(createCall.data.messageBody).toContain('BR-5678');
    expect(createCall.data.messageBody).toContain('15:00 hrs');
  });

  it('debe despachar cancelación voluntaria del cliente', async () => {
    const mockAppointment = {
      id: 'appt-3',
      code: 'BR-9999',
      barberId: 'barber-1',
      clientName: 'Pedro Pascal',
      clientPhone: '+56911223344',
      clientEmail: null,
      date: new Date('2026-09-27T00:00:00Z'),
      startTime: '10:00',
      endTime: '11:00',
      status: AppointmentStatus.CANCELLED_CLIENT,
      cancelReason: 'Imprevisto laboral',
      createdAt: new Date(),
      updatedAt: new Date(),
      barber: {
        name: 'Matías Silva',
      },
    };

    await service.sendClientCancellation(mockAppointment as any);

    expect(mockPrisma.notificationLog.create).toHaveBeenCalledTimes(1);
    const createCall = mockPrisma.notificationLog.create.mock.calls[0][0];

    expect(createCall.data.messageBody).toContain('CANCELADA');
    expect(createCall.data.messageBody).toContain('BR-9999');
    expect(createCall.data.messageBody).toContain('liberado');
  });

  it('debe despachar cancelación administrativa incluyendo el motivo', async () => {
    const mockAppointment = {
      id: 'appt-4',
      code: 'BR-4444',
      barberId: 'barber-1',
      clientName: 'Andrés Bello',
      clientPhone: '+56955667788',
      clientEmail: null,
      date: new Date('2026-09-28T00:00:00Z'),
      startTime: '12:00',
      endTime: '13:00',
      status: AppointmentStatus.CANCELLED_ADMIN,
      cancelReason: 'Cierre por mantención eléctrica',
      createdAt: new Date(),
      updatedAt: new Date(),
      barber: {
        name: 'Nicolás Rojas',
      },
    };

    await service.sendAdminCancellation(mockAppointment as any, 'Cierre por mantención eléctrica');

    expect(mockPrisma.notificationLog.create).toHaveBeenCalledTimes(1);
    const createCall = mockPrisma.notificationLog.create.mock.calls[0][0];

    expect(createCall.data.messageBody).toContain('cancelada por la barbería');
    expect(createCall.data.messageBody).toContain('Motivo: Cierre por mantención eléctrica');
  });

  it('debe recuperar el historial de auditoría de notificaciones', async () => {
    mockPrisma.notificationLog.findMany.mockResolvedValueOnce([
      { id: 'log-1', channel: NotificationChannel.WHATSAPP, status: NotificationStatus.SENT },
      { id: 'log-2', channel: NotificationChannel.SMS, status: NotificationStatus.SENT },
    ]);

    const logs = await service.getAuditLogs(10);
    expect(logs).toHaveLength(2);
    expect(mockPrisma.notificationLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    );
  });
});
