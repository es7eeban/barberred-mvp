import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { AppointmentStatus } from '@prisma/client';
import { LoginDto } from './dto/login.dto.js';
import { AdminCancelAppointmentDto } from './dto/admin-cancel-appointment.dto.js';
import { CreateScheduleBlockDto } from './dto/create-schedule-block.dto.js';
import { UpdateWorkingHoursDto } from './dto/update-working-hours.dto.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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

    return updated;
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
    const barber = await this.prisma.barber.findUnique({
      where: { id: dto.barberId },
    });

    if (!barber) {
      throw new NotFoundException(`Barbero con ID ${dto.barberId} no encontrado.`);
    }

    const date = this.parseDate(dto.date);

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
