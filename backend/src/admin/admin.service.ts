import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { AppointmentStatus } from '@prisma/client';
import { LoginDto } from './dto/login.dto.js';
import { AdminCancelAppointmentDto } from './dto/admin-cancel-appointment.dto.js';
import { CreateScheduleBlockDto } from './dto/create-schedule-block.dto.js';
import { UpdateWorkingHoursDto } from './dto/update-working-hours.dto.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.adminUser.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas. Revisa tu correo y contraseña.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas. Revisa tu correo y contraseña.');
    }

    const payload = { sub: user.id, email: user.email, name: user.name };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async getAppointments(filters: { date?: string; barberId?: string; status?: AppointmentStatus }) {
    const where: any = {};

    if (filters.date) {
      where.date = this.parseDate(filters.date);
    }

    if (filters.barberId) {
      where.barberId = filters.barberId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    return this.prisma.appointment.findMany({
      where,
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
      orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
    });
  }

  async cancelAppointment(id: string, dto: AdminCancelAppointmentDto) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { barber: true },
    });

    if (!appointment) {
      throw new NotFoundException(`No se encontró la cita con ID ${id}.`);
    }

    if (
      appointment.status === AppointmentStatus.CANCELLED_ADMIN ||
      appointment.status === AppointmentStatus.CANCELLED_CLIENT
    ) {
      throw new BadRequestException('Esta cita ya se encuentra cancelada.');
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED_ADMIN,
        cancelReason: dto.reason.trim(),
      },
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

    // Despacho asíncrono en segundo plano
    this.notificationsService
      .sendAdminCancellation(updated as any, dto.reason.trim())
      .catch((err) =>
        this.logger.error(
          `Error despachando notificación de cancelación administrativa para la cita ${id}: ${err.message}`,
        ),
      );

    return updated;
  }

  async getNotificationLogs() {
    return this.notificationsService.getAuditLogs();
  }

  async getBarbers() {
    return this.prisma.barber.findMany({
      include: {
        workingHours: {
          orderBy: { dayOfWeek: 'asc' },
        },
        scheduleBlocks: {
          orderBy: { date: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async updateBarberSchedule(barberId: string, dto: UpdateWorkingHoursDto) {
    const barber = await this.prisma.barber.findUnique({
      where: { id: barberId },
    });

    if (!barber) {
      throw new NotFoundException(`Barbero con ID ${barberId} no encontrado.`);
    }

    const operations = dto.workingHours.map((wh) =>
      this.prisma.workingHour.upsert({
        where: {
          barberId_dayOfWeek: {
            barberId,
            dayOfWeek: wh.dayOfWeek,
          },
        },
        update: {
          startHour: wh.startHour,
          endHour: wh.endHour,
          isActive: wh.isActive,
        },
        create: {
          barberId,
          dayOfWeek: wh.dayOfWeek,
          startHour: wh.startHour,
          endHour: wh.endHour,
          isActive: wh.isActive,
        },
      }),
    );

    await this.prisma.$transaction(operations);

    return this.prisma.workingHour.findMany({
      where: { barberId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async createScheduleBlock(dto: CreateScheduleBlockDto) {
    const date = this.parseDate(dto.date);

    // Caso 1: Bloquear para TODOS los barberos activos (ej. Feriado o Cierre de local)
    if (dto.barberId === 'ALL') {
      const activeBarbers = await this.prisma.barber.findMany({
        where: { isActive: true },
      });

      if (activeBarbers.length === 0) {
        throw new NotFoundException('No hay barberos activos registrados en el sistema.');
      }

      const createdBlocks = [];
      for (const barber of activeBarbers) {
        const existing = await this.prisma.scheduleBlock.findFirst({
          where: {
            barberId: barber.id,
            date,
            isFullDay: dto.isFullDay,
            startTime: dto.isFullDay ? null : dto.startTime,
          },
        });

        if (!existing) {
          const block = await this.prisma.scheduleBlock.create({
            data: {
              barberId: barber.id,
              date,
              isFullDay: dto.isFullDay,
              startTime: dto.isFullDay ? null : dto.startTime,
              reason: dto.reason ? dto.reason.trim() : null,
            },
          });
          createdBlocks.push(block);
        }
      }

      return {
        success: true,
        count: createdBlocks.length,
        message: `Bloqueo aplicado a ${createdBlocks.length} barberos exitosamente.`,
        blocks: createdBlocks,
      };
    }

    // Caso 2: Bloquear para un barbero específico
    const barber = await this.prisma.barber.findUnique({
      where: { id: dto.barberId },
    });

    if (!barber) {
      throw new NotFoundException(`Barbero con ID ${dto.barberId} no encontrado.`);
    }

    // Validar si ya existe un bloqueo idéntico
    const existing = await this.prisma.scheduleBlock.findFirst({
      where: {
        barberId: dto.barberId,
        date,
        isFullDay: dto.isFullDay,
        startTime: dto.isFullDay ? null : dto.startTime,
      },
    });

    if (existing) {
      throw new ConflictException('Ya existe un bloqueo administrativo para este barbero y horario.');
    }

    return this.prisma.scheduleBlock.create({
      data: {
        barberId: dto.barberId,
        date,
        isFullDay: dto.isFullDay,
        startTime: dto.isFullDay ? null : dto.startTime,
        reason: dto.reason ? dto.reason.trim() : null,
      },
    });
  }

  async deleteScheduleBlock(id: string) {
    const block = await this.prisma.scheduleBlock.findUnique({
      where: { id },
    });

    if (!block) {
      throw new NotFoundException(`No se encontró el bloqueo con ID ${id}.`);
    }

    await this.prisma.scheduleBlock.delete({
      where: { id },
    });

    return { success: true, message: 'Bloqueo eliminado exitosamente.' };
  }
}
