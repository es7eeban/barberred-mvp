import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AvailabilityService } from './availability.service.js';
import { NotFoundException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      barber: {
        findUnique: vi.fn(),
      },
      workingHour: {
        findUnique: vi.fn(),
      },
      scheduleBlock: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      appointment: {
        findMany: vi.fn(),
      },
    };

    service = new AvailabilityService(mockPrisma as any);
  });

  it('debe lanzar NotFoundException si el barbero no existe o está inactivo', async () => {
    mockPrisma.barber.findUnique.mockResolvedValue(null);

    await expect(
      service.getAvailability('barber-inexistente', '2026-10-15'),
    ).rejects.toThrow(NotFoundException);
  });

  it('debe retornar isOpen: false si el barbero no atiende ese día', async () => {
    mockPrisma.barber.findUnique.mockResolvedValue({
      id: 'barber-1',
      name: 'Carlos Mendoza',
      isActive: true,
    });
    mockPrisma.workingHour.findUnique.mockResolvedValue(null);

    const result = await service.getAvailability('barber-1', '2026-10-18'); // Domingo

    expect(result.isOpen).toBe(false);
    expect(result.slots).toHaveLength(0);
    expect(result.message).toContain('no atienden');
  });

  it('debe retornar isOpen: false si hay un bloqueo administrativo de día completo', async () => {
    mockPrisma.barber.findUnique.mockResolvedValue({
      id: 'barber-1',
      name: 'Carlos Mendoza',
      isActive: true,
    });
    mockPrisma.workingHour.findUnique.mockResolvedValue({
      barberId: 'barber-1',
      dayOfWeek: 5,
      startHour: 10,
      endHour: 19,
      isActive: true,
    });
    mockPrisma.scheduleBlock.findFirst.mockResolvedValue({
      id: 'block-1',
      isFullDay: true,
      reason: 'Feriado Nacional',
    });

    const result = await service.getAvailability('barber-1', '2026-10-16');

    expect(result.isOpen).toBe(false);
    expect(result.slots).toHaveLength(0);
    expect(result.message).toBe('Feriado Nacional');
  });

  it('debe calcular correctamente los slots disponibles, ocupados y bloqueados', async () => {
    mockPrisma.barber.findUnique.mockResolvedValue({
      id: 'barber-1',
      name: 'Carlos Mendoza',
      isActive: true,
    });
    // Horario: 10:00 a 14:00 (4 slots: 10:00, 11:00, 12:00, 13:00)
    mockPrisma.workingHour.findUnique.mockResolvedValue({
      barberId: 'barber-1',
      dayOfWeek: 2,
      startHour: 10,
      endHour: 14,
      isActive: true,
    });
    mockPrisma.scheduleBlock.findFirst.mockResolvedValue(null);

    // Cita confirmada a las 11:00
    mockPrisma.appointment.findMany.mockResolvedValue([
      { startTime: '11:00' },
    ]);

    // Bloqueo parcial a las 12:00
    mockPrisma.scheduleBlock.findMany.mockResolvedValue([
      { startTime: '12:00', reason: 'Almuerzo' },
    ]);

    // Fecha futura para evitar slots pasados
    const result = await service.getAvailability('barber-1', '2028-11-20');

    expect(result.isOpen).toBe(true);
    expect(result.allSlots).toHaveLength(4);

    // Slot 10:00 -> disponible
    expect(result.allSlots[0]).toEqual({ time: '10:00', available: true });

    // Slot 11:00 -> booked
    expect(result.allSlots[1]).toEqual({
      time: '11:00',
      available: false,
      reason: 'booked',
    });

    // Slot 12:00 -> blocked
    expect(result.allSlots[2]).toEqual({
      time: '12:00',
      available: false,
      reason: 'blocked',
    });

    // Slot 13:00 -> disponible
    expect(result.allSlots[3]).toEqual({ time: '13:00', available: true });

    // Slots disponibles resultantes
    expect(result.availableSlots).toEqual(['10:00', '13:00']);
  });
});
