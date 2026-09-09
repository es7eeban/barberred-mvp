import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { BarbersService } from './barbers.service.js';

@Controller('barbers')
export class BarbersController {
  constructor(private readonly barbersService: BarbersService) {}

  @Get()
  async getBarbers() {
    return this.barbersService.findAllActive();
  }

  @Get(':id')
  async getBarberById(@Param('id') id: string) {
    const barber = await this.barbersService.findById(id);
    if (!barber) {
      throw new NotFoundException(`Barbero con ID ${id} no encontrado.`);
    }
    return barber;
  }
}
