import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { LoginDto } from './dto/login.dto.js';
import { AdminCancelAppointmentDto } from './dto/admin-cancel-appointment.dto.js';
import { CreateScheduleBlockDto } from './dto/create-schedule-block.dto.js';
import { UpdateWorkingHoursDto } from './dto/update-working-hours.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { AppointmentStatus } from '@prisma/client';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('auth/login')
  async login(@Body() dto: LoginDto) {
    return this.adminService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('auth/me')
  async getProfile(@Request() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('appointments')
  async getAppointments(
    @Query('date') date?: string,
    @Query('barberId') barberId?: string,
    @Query('status') status?: AppointmentStatus,
  ) {
    return this.adminService.getAppointments({ date, barberId, status });
  }

  @UseGuards(JwtAuthGuard)
  @Post('appointments/:id/cancel')
  async cancelAppointment(
    @Param('id') id: string,
    @Body() dto: AdminCancelAppointmentDto,
  ) {
    return this.adminService.cancelAppointment(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('barbers')
  async getBarbers() {
    return this.adminService.getBarbers();
  }

  @UseGuards(JwtAuthGuard)
  @Put('barbers/:id/schedule')
  async updateBarberSchedule(
    @Param('id') barberId: string,
    @Body() dto: UpdateWorkingHoursDto,
  ) {
    return this.adminService.updateBarberSchedule(barberId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('schedule-blocks')
  async createScheduleBlock(@Body() dto: CreateScheduleBlockDto) {
    return this.adminService.createScheduleBlock(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('schedule-blocks/:id')
  async deleteScheduleBlock(@Param('id') id: string) {
    return this.adminService.deleteScheduleBlock(id);
  }
}
