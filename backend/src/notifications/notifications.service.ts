import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  NotificationChannel,
  NotificationStatus,
  type Appointment,
} from '@prisma/client';
import twilio from 'twilio';

export type AppointmentWithBarber = Appointment & {
  barber: {
    name: string;
    phone?: string | null;
  };
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly twilioClient: twilio.Twilio | null = null;
  private readonly isMockMode: boolean;
  private readonly whatsappFrom: string;
  private readonly smsFrom: string;
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.whatsappFrom =
      this.configService.get<string>('TWILIO_WHATSAPP_NUMBER') ||
      'whatsapp:+14155238886';
    this.smsFrom =
      this.configService.get<string>('TWILIO_SMS_NUMBER') || '+14155238886';
    this.appUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:5173';

    // Detectar si las credenciales de Twilio son reales o placeholders de desarrollo
    const isValidSid =
      Boolean(accountSid) &&
      accountSid!.startsWith('AC') &&
      !accountSid!.includes('dummy');
    const isValidToken = Boolean(authToken) && !authToken!.includes('dummy');

    if (isValidSid && isValidToken) {
      try {
        this.twilioClient = twilio(accountSid, authToken);
        this.isMockMode = false;
        this.logger.log(
          '✅ Twilio Client inicializado exitosamente (WhatsApp activo + SMS Fallback).',
        );
      } catch (err: any) {
        this.logger.error(
          `Error inicializando cliente Twilio: ${err.message}. Activando modo simulado.`,
        );
        this.twilioClient = null;
        this.isMockMode = true;
      }
    } else {
      this.twilioClient = null;
      this.isMockMode = true;
      this.logger.log(
        'ℹ️ Modo Notificaciones Simulado (MOCK) activo. Los mensajes se imprimirán en consola y se guardarán en NotificationLog.',
      );
    }
  }

  /**
   * Normaliza números de teléfono al formato internacional E.164 (+56912345678)
   */
  private formatToE164(phone: string): string {
    let clean = phone.replace(/[^\d+]/g, '');
    if (!clean.startsWith('+')) {
      if (clean.length === 9) {
        // Formato móvil chileno estándar (9 dígitos)
        clean = `+56${clean}`;
      } else {
        clean = `+${clean}`;
      }
    }
    return clean;
  }

  /**
   * Formatea una fecha UTC al formato legible en español
   */
  private formatDate(date: Date): string {
    const months = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    const days = [
      'domingo',
      'lunes',
      'martes',
      'miércoles',
      'jueves',
      'viernes',
      'sábado',
    ];

    const d = new Date(date);
    const dayOfWeek = days[d.getUTCDay()];
    const dayNum = d.getUTCDate();
    const monthName = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();

    return `${dayOfWeek} ${dayNum} de ${monthName}, ${year}`;
  }

  /**
   * Despacha el mensaje de forma asíncrona registrando la auditoría en NotificationLog.
   * Si está en modo real, intenta WhatsApp primero y recurre a SMS en caso de error.
   */
  async dispatch(
    appointmentId: string,
    recipientPhone: string,
    messageBody: string,
  ): Promise<void> {
    const e164Phone = this.formatToE164(recipientPhone);

    if (this.isMockMode || !this.twilioClient) {
      // Modo Simulado (Desarrollo / Local)
      const mockId = `mock-msg-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      this.logger.log(
        `\n` +
          `======================= [NOTIFICACIÓN SIMULADA - WHATSAPP] =======================\n` +
          `📱 Destinatario: ${e164Phone}\n` +
          `📅 Fecha/Hora:   ${new Date().toLocaleString()}\n` +
          `💬 Mensaje:\n${messageBody}\n` +
          `==================================================================================\n`,
      );

      try {
        await this.prisma.notificationLog.create({
          data: {
            appointmentId,
            channel: NotificationChannel.WHATSAPP,
            recipient: e164Phone,
            messageBody,
            status: NotificationStatus.SENT,
            externalId: mockId,
          },
        });
      } catch (err: any) {
        this.logger.error(
          `Error guardando log de notificación simulada: ${err.message}`,
        );
      }
      return;
    }

    // Modo Real con Twilio: WhatsApp con Fallback automático a SMS
    try {
      const waFrom = this.whatsappFrom.startsWith('whatsapp:')
        ? this.whatsappFrom
        : `whatsapp:${this.whatsappFrom}`;
      const waTo = `whatsapp:${e164Phone}`;

      this.logger.log(
        `Enviando mensaje WhatsApp a ${waTo} mediante Twilio...`,
      );

      const res = await this.twilioClient.messages.create({
        from: waFrom,
        to: waTo,
        body: messageBody,
      });

      await this.prisma.notificationLog.create({
        data: {
          appointmentId,
          channel: NotificationChannel.WHATSAPP,
          recipient: e164Phone,
          messageBody,
          status: NotificationStatus.SENT,
          externalId: res.sid,
        },
      });

      this.logger.log(`WhatsApp entregado a Twilio con SID: ${res.sid}`);
    } catch (waErr: any) {
      this.logger.warn(
        `Fallo envío WhatsApp a ${e164Phone}: ${waErr.message}. Iniciando fallback a SMS...`,
      );

      try {
        const smsRes = await this.twilioClient.messages.create({
          from: this.smsFrom,
          to: e164Phone,
          body: messageBody,
        });

        await this.prisma.notificationLog.create({
          data: {
            appointmentId,
            channel: NotificationChannel.SMS,
            recipient: e164Phone,
            messageBody,
            status: NotificationStatus.SENT,
            externalId: smsRes.sid,
          },
        });

        this.logger.log(
          `SMS fallback entregado a Twilio con SID: ${smsRes.sid}`,
        );
      } catch (smsErr: any) {
        this.logger.error(
          `SMS fallback también falló para ${e164Phone}: ${smsErr.message}`,
        );

        await this.prisma.notificationLog.create({
          data: {
            appointmentId,
            channel: NotificationChannel.WHATSAPP,
            recipient: e164Phone,
            messageBody,
            status: NotificationStatus.FAILED,
            errorDetails: `WhatsApp error: ${waErr.message} | SMS error: ${smsErr.message}`,
          },
        });
      }
    }
  }

  /**
   * Notificación 1: Confirmación de nueva reserva
   */
  async sendBookingConfirmation(appointment: AppointmentWithBarber): Promise<void> {
    const formattedDate = this.formatDate(appointment.date);
    const message =
      `¡Hola ${appointment.clientName}! 💈 Tu cita en BarberRed está confirmada.\n\n` +
      `✂️ Barbero: ${appointment.barber.name}\n` +
      `📅 Fecha: ${formattedDate}\n` +
      `⏰ Hora: ${appointment.startTime} hrs\n` +
      `🔖 Código de Cita: ${appointment.code}\n\n` +
      `Puedes consultar o gestionar tu cita en cualquier momento aquí:\n` +
      `${this.appUrl}?phone=${encodeURIComponent(appointment.clientPhone)}`;

    await this.dispatch(appointment.id, appointment.clientPhone, message);
  }

  /**
   * Notificación 2: Reprogramación de cita existente
   */
  async sendRescheduleConfirmation(
    appointment: AppointmentWithBarber,
  ): Promise<void> {
    const formattedDate = this.formatDate(appointment.date);
    const message =
      `¡Hola ${appointment.clientName}! 💈 Tu cita #${appointment.code} en BarberRed ha sido REPROGRAMADA.\n\n` +
      `✂️ Barbero: ${appointment.barber.name}\n` +
      `📅 Nueva Fecha: ${formattedDate}\n` +
      `⏰ Nueva Hora: ${appointment.startTime} hrs\n\n` +
      `Puedes revisar los detalles de tu cita aquí:\n` +
      `${this.appUrl}?phone=${encodeURIComponent(appointment.clientPhone)}`;

    await this.dispatch(appointment.id, appointment.clientPhone, message);
  }

  /**
   * Notificación 3: Cancelación voluntaria por el cliente
   */
  async sendClientCancellation(appointment: AppointmentWithBarber): Promise<void> {
    const formattedDate = this.formatDate(appointment.date);
    const message =
      `Hola ${appointment.clientName}. Tu cita #${appointment.code} con ${appointment.barber.name} para el ${formattedDate} a las ${appointment.startTime} hrs ha sido CANCELADA.\n\n` +
      `El horario ha sido liberado. Si deseas volver a agendar en el futuro, visítanos en:\n` +
      `${this.appUrl}`;

    await this.dispatch(appointment.id, appointment.clientPhone, message);
  }

  /**
   * Notificación 4: Cancelación por la administración / barbería
   */
  async sendAdminCancellation(
    appointment: AppointmentWithBarber,
    reason: string,
  ): Promise<void> {
    const formattedDate = this.formatDate(appointment.date);
    const message =
      `Hola ${appointment.clientName}. Te informamos que tu cita #${appointment.code} con ${appointment.barber.name} para el ${formattedDate} a las ${appointment.startTime} hrs ha sido cancelada por la barbería.\n\n` +
      `Motivo: ${reason}\n\n` +
      `Disculpa los inconvenientes ocasionados. Si deseas agendar un nuevo horario, visítanos en:\n` +
      `${this.appUrl}`;

    await this.dispatch(appointment.id, appointment.clientPhone, message);
  }

  /**
   * Obtiene el listado de auditoría de notificaciones enviadas
   */
  async getAuditLogs(take = 50) {
    return this.prisma.notificationLog.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        appointment: {
          select: {
            code: true,
            clientName: true,
            clientPhone: true,
            barber: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  }
}
