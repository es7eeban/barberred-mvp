/**
 * Script de Prueba de Concurrencia - BarberRed (Fase 5 - T-5.2)
 *
 * Dispara 10 solicitudes de reserva simultáneas (en paralelo exacto) para el mismo
 * barbero, misma fecha y mismo horario (slot).
 *
 * Criterio de Aceptación:
 * - Exactamente 1 solicitud debe tener éxito (HTTP 201 Created).
 * - Exactamente 9 solicitudes deben ser rechazadas con conflicto atómico (HTTP 409 Conflict).
 */

const API_BASE = process.env.API_URL || 'http://localhost:3000/api';

async function runConcurrencyTest() {
  console.log('\n=============================================================');
  console.log('🧪 INICIANDO TEST DE CONCURRENCIA - BARBERRED (T-5.2)');
  console.log('=============================================================\n');

  // 1. Obtener lista de barberos
  console.log('1️⃣ Obteniendo barberos disponibles...');
  const barbersRes = await fetch(`${API_BASE}/barbers`);
  if (!barbersRes.ok) {
    throw new Error(`Error obteniendo barberos: ${barbersRes.statusText}`);
  }
  const barbers = await barbersRes.json();
  if (barbers.length === 0) {
    throw new Error('No hay barberos en la base de datos.');
  }

  const barber = barbers[0];
  console.log(`   Barbero seleccionado: ${barber.name} (ID: ${barber.id})`);

  // 2. Definir fecha futura que caiga en día laboral (ej. dentro de 10 días a las 15:00)
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 10);
  // Si cae domingo (0), sumar 1 día más
  if (targetDate.getDay() === 0) {
    targetDate.setDate(targetDate.getDate() + 1);
  }
  const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

  // 3. Consultar disponibilidad para elegir un slot libre
  console.log(`2️⃣ Consultando disponibilidad para la fecha: ${dateStr}...`);
  const availRes = await fetch(`${API_BASE}/availability?barberId=${barber.id}&date=${dateStr}`);
  const availData = await availRes.json();

  if (!availData.isOpen || !availData.availableSlots || availData.availableSlots.length === 0) {
    throw new Error(`El barbero no tiene slots disponibles en ${dateStr}. Mensaje: ${availData.message}`);
  }

  // Tomamos el primer slot disponible
  const targetSlot = availData.availableSlots[0];
  console.log(`   Slot objetivo para la colisión: ${targetSlot} hrs en ${dateStr}\n`);

  // 4. Preparar 10 solicitudes de reserva simultáneas con diferentes nombres
  console.log('3️⃣ Disparando 10 reservas simultáneas con Promise.all()...\n');

  const requests = Array.from({ length: 10 }, (_, index) => {
    const clientIndex = index + 1;
    const body = {
      barberId: barber.id,
      date: dateStr,
      startTime: targetSlot,
      clientName: `Cliente Concurrente ${clientIndex}`,
      clientPhone: `+569${String(10000000 + clientIndex)}`,
      clientEmail: `test${clientIndex}@concurrency.local`,
    };

    return fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      return {
        clientIndex,
        status: res.status,
        ok: res.ok,
        data,
      };
    });
  });

  const startTime = Date.now();
  const results = await Promise.all(requests);
  const duration = Date.now() - startTime;

  // 5. Analizar resultados
  console.log('📊 RESULTADOS DE LAS 10 SOLICITUDES SIMULTÁNEAS:');
  console.log('-------------------------------------------------------------');

  let successCount = 0;
  let conflictCount = 0;
  let otherCount = 0;
  let confirmedCode = '';

  for (const r of results) {
    if (r.status === 201) {
      successCount++;
      confirmedCode = r.data.code;
      console.log(`  ✅ Cliente #${r.clientIndex}: HTTP 201 CREATED -> Cita confirmada (Código: ${r.data.code})`);
    } else if (r.status === 409) {
      conflictCount++;
      console.log(`  ❌ Cliente #${r.clientIndex}: HTTP 409 CONFLICT -> ${r.data.message || 'Horario reservado'}`);
    } else {
      otherCount++;
      console.log(`  ⚠️ Cliente #${r.clientIndex}: HTTP ${r.status} -> ${JSON.stringify(r.data)}`);
    }
  }

  console.log('-------------------------------------------------------------');
  console.log(`⏱️ Tiempo total de procesamiento concurrente: ${duration} ms`);
  console.log(`🟢 Reservas Aceptadas (201):    ${successCount} / 10`);
  console.log(`🔴 Conflictos Detectados (409): ${conflictCount} / 10`);
  if (otherCount > 0) {
    console.log(`⚠️ Otros códigos HTTP:         ${otherCount} / 10`);
  }
  console.log('-------------------------------------------------------------');

  // 6. Validación de Criterios de Aceptación
  if (successCount === 1 && conflictCount === 9) {
    console.log('\n🏆 ¡TEST DE CONCURRENCIA APROBADO EXITOSAMENTE!');
    console.log('🔒 La transacción atómica ($transaction) de Prisma y el bloqueo a nivel de BD');
    console.log('   garantizaron la exclusión mutua: exactamente 1 cita creada sin doble agendamiento.');
    console.log(`   Cita ganadora confirmada: ${confirmedCode}\n`);

    // Limpieza automática de la cita de test para mantener la base de datos limpia
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.appointment.deleteMany({
        where: { clientEmail: { contains: '@concurrency.local' } },
      });
      await prisma.$disconnect();
      console.log('🧹 Cita de prueba limpiada de la base de datos.');
    } catch {
      // Ignorar si no se puede conectar directamente
    }

    process.exit(0);
  } else {
    console.error('\n❌ TEST FALLIDO: No se cumplió el criterio de 1 éxito y 9 conflictos.');
    process.exit(1);
  }
}

runConcurrencyTest().catch((err) => {
  console.error('\n💥 Error ejecutando test de concurrencia:', err.message);
  process.exit(1);
});
