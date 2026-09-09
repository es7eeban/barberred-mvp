import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto.js';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto.js';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  async createAppointment(@Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(dto);
  }

  @Get('lookup')
  async lookupByPhone(@Query('phone') phone: string) {
    if (!phone || phone.trim().length < 4) {
      throw new BadRequestException('Debes proporcionar un número telefónico de al menos 4 dígitos.');
    }
    return this.appointmentsService.lookupByPhone(phone);
  }

  @Get(':code')
  async getAppointmentByCode(@Param('code') code: string) {
    return this.appointmentsService.findByCode(code);
  }

  @Patch(':code/reschedule')
  async rescheduleAppointment(
    @Param('code') code: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.appointmentsService.reschedule(code, dto);
  }

  @Post(':code/cancel')
  async cancelAppointment(
    @Param('code') code: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    return this.appointmentsService.cancel(code, dto);
  }
}
