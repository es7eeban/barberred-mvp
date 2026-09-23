import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppointmentsService } from './appointments.service.js';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let mockPrisma: any;
  let mockNotificationsService: any;

  beforeEach(() => {
    mockNotificationsService = {
      sendBookingConfirmation: vi.fn().mockResolvedValue(undefined),
      sendRescheduleConfirmation: vi.fn().mockResolvedValue(undefined),
      sendClientCancellation: vi.fn().mockResolvedValue(undefined),
    };

    mockPrisma = {
      $transaction: vi.fn((callback) => callback(mockPrisma)),
      $executeRaw: vi.fn().mockResolvedValue(1),
      barber: {
        findUnique: vi.fn(),
      },
      workingHour: {
        findUnique: vi.fn(),
      },
      scheduleBlock: {
        findFirst: vi.fn(),
      },
      appointment: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    service = new AppointmentsService(mockPrisma as any, mockNotificationsService as any);
  });

  describe('create', () => {
    it('debe lanzar NotFoundException si el barbero no existe o está inactivo', async () => {
      mockPrisma.barber.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          barberId: 'barber-unknown',
          date: '2028-10-15',
          startTime: '11:00',
          clientName: 'Roberto Gómez',
          clientPhone: '+56912345678',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar ConflictException si el slot ya está reservado por otra cita confirmada', async () => {
      mockPrisma.barber.findUnique.mockResolvedValue({
        id: 'barber-1',
        isActive: true,
      });
      mockPrisma.workingHour.findUnique.mockResolvedValue({
        barberId: 'barber-1',
        dayOfWeek: 0,
        startHour: 10,
        endHour: 19,
        isActive: true,
      });
      mockPrisma.scheduleBlock.findFirst.mockResolvedValue(null);
      // Colisión encontrada
      mockPrisma.appointment.findFirst.mockResolvedValue({
        id: 'existing-appt',
        status: AppointmentStatus.CONFIRMED,
      });

      await expect(
        service.create({
          barberId: 'barber-1',
          date: '2028-10-15',
          startTime: '11:00',
          clientName: 'Roberto Gómez',
          clientPhone: '+56912345678',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('debe crear la cita exitosamente y disparar sendBookingConfirmation', async () => {
      mockPrisma.barber.findUnique.mockResolvedValue({
        id: 'barber-1',
        name: 'Matías Silva',
        isActive: true,
      });
      mockPrisma.workingHour.findUnique.mockResolvedValue({
        barberId: 'barber-1',
        dayOfWeek: 0,
        startHour: 10,
        endHour: 19,
        isActive: true,
      });
      mockPrisma.scheduleBlock.findFirst.mockResolvedValue(null);
      mockPrisma.appointment.findFirst.mockResolvedValue(null); // Sin colisiones
      mockPrisma.appointment.findUnique.mockResolvedValue(null); // Código único libre

      const createdMock = {
        id: 'new-appt-id',
        code: 'BR-7777',
        barberId: 'barber-1',
        clientName: 'Roberto Gómez',
        clientPhone: '+56912345678',
        clientEmail: null,
        date: new Date('2028-10-15T00:00:00Z'),
        startTime: '11:00',
        endTime: '12:00',
        status: AppointmentStatus.CONFIRMED,
        barber: {
          name: 'Matías Silva',
          phone: '+56987654321',
          avatarUrl: null,
        },
      };

      mockPrisma.appointment.create.mockResolvedValue(createdMock);

      const result = await service.create({
        barberId: 'barber-1',
        date: '2028-10-15',
        startTime: '11:00',
        clientName: 'Roberto Gómez',
        clientPhone: '+56912345678',
      });

      expect(result.code).toBe('BR-7777');
      expect(result.status).toBe(AppointmentStatus.CONFIRMED);
      expect(mockNotificationsService.sendBookingConfirmation).toHaveBeenCalledWith(createdMock);
    });
  });

  describe('cancel', () => {
    it('debe rechazar la cancelación si faltan menos de 2 horas para la cita', async () => {
      // Cita programada para dentro de 30 minutos
      const in30Min = new Date(Date.now() + 30 * 60 * 1000);
      const year = in30Min.getUTCFullYear();
      const month = String(in30Min.getUTCMonth() + 1).padStart(2, '0');
      const day = String(in30Min.getUTCDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const hourStr = `${String(in30Min.getUTCHours()).padStart(2, '0')}:00`;

      mockPrisma.appointment.findUnique.mockResolvedValue({
        id: 'appt-imminent',
        code: 'BR-1111',
        date: new Date(Date.UTC(year, in30Min.getUTCMonth(), in30Min.getUTCDate())),
        startTime: hourStr,
        status: AppointmentStatus.CONFIRMED,
        barber: { name: 'Carlos' },
      });

      await expect(
        service.cancel('BR-1111', { reason: 'No alcanzo a llegar' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe cancelar exitosamente si cumple con la anticipación de 2 horas', async () => {
      // Cita programada para dentro de 2 días
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const year = futureDate.getUTCFullYear();
      const month = String(futureDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(futureDate.getUTCDate()).padStart(2, '0');

      const existingAppt = {
        id: 'appt-far',
        code: 'BR-2222',
        date: new Date(Date.UTC(year, futureDate.getUTCMonth(), futureDate.getUTCDate())),
        startTime: '15:00',
        status: AppointmentStatus.CONFIRMED,
        barber: { name: 'Carlos', phone: '+56911223344' },
      };

      mockPrisma.appointment.findUnique.mockResolvedValue(existingAppt);
      mockPrisma.appointment.update.mockResolvedValue({
        ...existingAppt,
        status: AppointmentStatus.CANCELLED_CLIENT,
        cancelReason: 'Viaje inesperado',
      });

      const response = await service.cancel('BR-2222', { reason: 'Viaje inesperado' });

      expect(response.success).toBe(true);
      expect(response.code).toBe('BR-2222');
      expect(mockNotificationsService.sendClientCancellation).toHaveBeenCalled();
    });
  });
});
