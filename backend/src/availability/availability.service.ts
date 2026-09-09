import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppointmentStatus } from '@prisma/client';

export interface SlotInfo {
  time: string; // ej: "10:00"
  available: boolean;
  reason?: 'booked' | 'blocked' | 'past';
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailability(barberId: string, dateStr: string) {
    // 1. Verificar existencia del barbero
    const barber = await this.prisma.barber.findUnique({
      where: { id: barberId },
    });
    if (!barber || !barber.isActive) {
      throw new NotFoundException('Barbero no encontrado o no activo.');
    }

    // 2. Parsear fecha
    const [year, month, day] = dateStr.split('-').map(Number);
    const queryDate = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = queryDate.getUTCDay(); // 0 = Domingo, 1 = Lunes, etc.

    // 3. Obtener horario de trabajo para ese día
    const schedule = await this.prisma.workingHour.findUnique({
      where: {
        barberId_dayOfWeek: {
          barberId,
          dayOfWeek,
        },
      },
    });

    if (!schedule || !schedule.isActive) {
      return {
        date: dateStr,
        barberId,
        barberName: barber.name,
        isOpen: false,
        message: 'La barbería o el barbero no atienden este día de la semana.',
        slots: [] as SlotInfo[],
      };
    }

    // 4. Verificar si existe bloqueo de día completo
    const fullDayBlock = await this.prisma.scheduleBlock.findFirst({
      where: {
        barberId,
        date: queryDate,
        isFullDay: true,
      },
    });

    if (fullDayBlock) {
      return {
        date: dateStr,
        barberId,
        barberName: barber.name,
        isOpen: false,
        message: fullDayBlock.reason || 'Día bloqueado por administración.',
        slots: [] as SlotInfo[],
      };
    }

    // 5. Cargar citas confirmadas del día
    const appointments = await this.prisma.appointment.findMany({
      where: {
        barberId,
        date: queryDate,
        status: AppointmentStatus.CONFIRMED,
      },
      select: { startTime: true },
    });
    const bookedTimes = new Set(appointments.map((a) => a.startTime));

    // 6. Cargar bloqueos de horarios parciales
    const partialBlocks = await this.prisma.scheduleBlock.findMany({
      where: {
        barberId,
        date: queryDate,
        isFullDay: false,
      },
      select: { startTime: true, reason: true },
    });
    const blockedTimes = new Map(
      partialBlocks.filter((b) => b.startTime).map((b) => [b.startTime as string, b.reason || 'Bloqueado']),
    );

    // 7. Evaluar si la fecha consultada es hoy para filtrar horas pasadas
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const currentHour = now.getHours();

    // 8. Generar slots en punto desde startHour hasta endHour - 1
    const slots: SlotInfo[] = [];
    for (let hour = schedule.startHour; hour < schedule.endHour; hour++) {
      const timeStr = `${String(hour).padStart(2, '0')}:00`;

      if (isToday && hour <= currentHour) {
        slots.push({ time: timeStr, available: false, reason: 'past' });
      } else if (bookedTimes.has(timeStr)) {
        slots.push({ time: timeStr, available: false, reason: 'booked' });
      } else if (blockedTimes.has(timeStr)) {
        slots.push({ time: timeStr, available: false, reason: 'blocked' });
      } else {
        slots.push({ time: timeStr, available: true });
      }
    }

    const availableSlots = slots.filter((s) => s.available).map((s) => s.time);

    return {
      date: dateStr,
      barberId,
      barberName: barber.name,
      isOpen: true,
      workingHours: {
        start: `${schedule.startHour}:00`,
        end: `${schedule.endHour}:00`,
      },
      availableSlots,
      allSlots: slots,
    };
  }
}
