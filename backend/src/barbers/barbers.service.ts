import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class BarbersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActive() {
    return this.prisma.barber.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        phone: true,
        avatarUrl: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.barber.findUnique({
      where: { id },
      include: {
        workingHours: true,
      },
    });
  }
}
