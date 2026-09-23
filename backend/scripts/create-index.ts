import { PrismaClient, AppointmentStatus } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    // Eliminar citas de test duplicadas
    await prisma.appointment.deleteMany({
      where: {
        clientEmail: {
          contains: '@concurrency.local',
        },
      },
    });

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_confirmed_barber_slot 
      ON appointments ("barberId", date, "startTime") 
      WHERE status = 'CONFIRMED';
    `);
    console.log('✅ Partial unique index unique_confirmed_barber_slot created in PostgreSQL!');
  } finally {
    await prisma.$disconnect();
  }
}

main();
