import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de datos para BarberRed...');

  // 1. Limpiar datos previos si existen
  await prisma.notificationLog.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.scheduleBlock.deleteMany();
  await prisma.workingHour.deleteMany();
  await prisma.barber.deleteMany();
  await prisma.adminUser.deleteMany();

  // 2. Crear Administrador por defecto
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.adminUser.create({
    data: {
      email: 'admin@barberred.com',
      name: 'Administrador Principal',
      passwordHash,
    },
  });
  console.log(`✅ Admin creado: ${admin.email}`);

  // 3. Crear Barberos
  const barber1 = await prisma.barber.create({
    data: {
      name: 'Carlos Mendoza (El Navaja)',
      phone: '+56911223344',
      avatarUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=300&h=300&fit=crop&crop=face',
      isActive: true,
    },
  });

  const barber2 = await prisma.barber.create({
    data: {
      name: 'Matías Silva (Fade Master)',
      phone: '+56955667788',
      avatarUrl: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=300&h=300&fit=crop&crop=face',
      isActive: true,
    },
  });
  console.log(`✅ Barberos creados: ${barber1.name}, ${barber2.name}`);

  // 4. Configurar Horarios laborales (Lunes a Sábado de 10:00 a 19:00)
  // DayOfWeek: 1 = Lunes, ..., 6 = Sábado
  for (const barber of [barber1, barber2]) {
    for (let day = 1; day <= 6; day++) {
      await prisma.workingHour.create({
        data: {
          barberId: barber.id,
          dayOfWeek: day,
          startHour: 10,
          endHour: 19,
          isActive: true,
        },
      });
    }
  }
  console.log('✅ Horarios laborales estándar configurados (Lunes a Sábado, 10:00 a 19:00).');

  console.log('🎉 Seed completado exitosamente.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
