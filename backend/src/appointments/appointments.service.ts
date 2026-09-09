import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppointmentStatus } from '@prisma/client';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto.js';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto.js';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private calculateEndTime(startTime: string): string {
    const [hour] = startTime.split(':').map(Number);
    const endHour = hour + 1;
    return `${String(endHour).padStart(2, '0')}:00`;
  }

  private generateCode(): string {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `BR-${num}`;
  }

  private parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  private checkCanModifyOrCancel(appointmentDate: Date, startTime: string): void {
    const [slotHour] = startTime.split(':').map(Number);
    const apptDateTime = new Date(appointmentDate.getTime());
    apptDateTime.setUTCHours(slotHour, 0, 0, 0);

    const now = new Date();
    const diffHours = (apptDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 2) {
      throw new BadRequestException(
        'Solo se permite cancelar o modificar citas con al menos 2 horas de anticipación. Para imprevistos de última hora, comunícate directamente con el local.',
      );
    }
  }

  async create(dto: CreateAppointmentDto) {
    const queryDate = this.parseDate(dto.date);
    const dayOfWeek = queryDate.getUTCDay();

    return this.prisma.$transaction(async (tx) => {
      // 1. Validar barbero
      const barber = await tx.barber.findUnique({
        where: { id: dto.barberId },
      });
      if (!barber || !barber.isActive) {
        throw new NotFoundException('Barbero no encontrado o no disponible.');
      }

      // 2. Validar que atienda ese día
      const schedule = await tx.workingHour.findUnique({
        where: {
          barberId_dayOfWeek: {
            barberId: dto.barberId,
            dayOfWeek,
          },
        },
      });
      if (!schedule || !schedule.isActive) {
        throw new BadRequestException('El barbero no atiende en el día seleccionado.');
      }

      // 3. Validar horario dentro de la jornada
      const [hour] = dto.startTime.split(':').map(Number);
      if (hour < schedule.startHour || hour >= schedule.endHour) {
        throw new BadRequestException(
          `La hora seleccionada está fuera del horario de atención (${schedule.startHour}:00 a ${schedule.endHour}:00).`,
        );
      }

      // 4. Validar que no sea una hora pasada si es hoy
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (dto.date === todayStr && hour <= now.getHours()) {
        throw new BadRequestException('No es posible agendar en horarios pasados.');
      }

      // 5. Validar bloqueos administrativos
      const block = await tx.scheduleBlock.findFirst({
        where: {
          barberId: dto.barberId,
          date: queryDate,
          OR: [{ isFullDay: true }, { startTime: dto.startTime }],
        },
      });
      if (block) {
        throw new ConflictException('Este horario o día se encuentra bloqueado por la administración.');
      }

      // 6. Validar colisión con otra cita confirmada (control de concurrencia atómico)
      const existing = await tx.appointment.findFirst({
        where: {
          barberId: dto.barberId,
          date: queryDate,
          startTime: dto.startTime,
          status: AppointmentStatus.CONFIRMED,
        },
      });
      if (existing) {
        throw new ConflictException(
          'El horario seleccionado acaba de ser reservado por otro cliente. Por favor elige otra hora.',
        );
      }

      // 7. Generar código único
      let code = this.generateCode();
      let codeExists = await tx.appointment.findUnique({ where: { code } });
      while (codeExists) {
        code = this.generateCode();
        codeExists = await tx.appointment.findUnique({ where: { code } });
      }

      // 8. Crear la reserva
      return tx.appointment.create({
        data: {
          code,
          barberId: dto.barberId,
          date: queryDate,
          startTime: dto.startTime,
          endTime: this.calculateEndTime(dto.startTime),
          clientName: dto.clientName.trim(),
          clientPhone: dto.clientPhone.trim(),
          clientEmail: dto.clientEmail ? dto.clientEmail.trim() : null,
          status: AppointmentStatus.CONFIRMED,
        },
        include: {
          barber: {
            select: {
              name: true,
              phone: true,
              avatarUrl: true,
            },
          },
        },
      });
    });
  }

  async findByCode(code: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        barber: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException(`No se encontró ninguna cita con el código ${code}.`);
    }

    return appointment;
  }

  async lookupByPhone(phone: string) {
    const cleanPhone = phone.trim();
    return this.prisma.appointment.findMany({
      where: {
        clientPhone: {
          contains: cleanPhone,
        },
      },
      include: {
        barber: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    });
  }

  async reschedule(code: string, dto: RescheduleAppointmentDto) {
    const appointment = await this.findByCode(code);

    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new BadRequestException(
        `La cita no puede reprogramarse porque su estado actual es ${appointment.status}.`,
      );
    }

    // Validar ventana de 2 horas de anticipación
    this.checkCanModifyOrCancel(appointment.date, appointment.startTime);

    const newQueryDate = this.parseDate(dto.newDate);
    const newDayOfWeek = newQueryDate.getUTCDay();

    return this.prisma.$transaction(async (tx) => {
      // Validar jornada del barbero en la nueva fecha
      const schedule = await tx.workingHour.findUnique({
        where: {
          barberId_dayOfWeek: {
            barberId: appointment.barberId,
            dayOfWeek: newDayOfWeek,
          },
        },
      });
      if (!schedule || !schedule.isActive) {
        throw new BadRequestException('El barbero no atiende en el nuevo día seleccionado.');
      }

      // Validar colisión en el nuevo horario
      const collision = await tx.appointment.findFirst({
        where: {
          barberId: appointment.barberId,
          date: newQueryDate,
          startTime: dto.newStartTime,
          status: AppointmentStatus.CONFIRMED,
          id: { not: appointment.id },
        },
      });
      if (collision) {
        throw new ConflictException('El nuevo horario seleccionado ya no está disponible.');
      }

      // Actualizar la cita
      return tx.appointment.update({
        where: { id: appointment.id },
        data: {
          date: newQueryDate,
          startTime: dto.newStartTime,
          endTime: this.calculateEndTime(dto.newStartTime),
        },
        include: {
          barber: {
            select: {
              name: true,
              phone: true,
              avatarUrl: true,
            },
          },
        },
      });
    });
  }

  async cancel(code: string, dto: CancelAppointmentDto) {
    const appointment = await this.findByCode(code);

    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new BadRequestException(`La cita ya se encuentra en estado ${appointment.status}.`);
    }

    // Validar ventana de 2 horas de anticipación
    this.checkCanModifyOrCancel(appointment.date, appointment.startTime);

    const updated = await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: AppointmentStatus.CANCELLED_CLIENT,
        cancelReason: dto.reason || 'Cancelada voluntariamente por el cliente.',
      },
    });

    return {
      success: true,
      code: updated.code,
      message: 'Tu cita ha sido cancelada exitosamente y el horario fue liberado.',
    };
  }
}
