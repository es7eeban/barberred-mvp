import { IsDateString, IsNotEmpty, Matches } from 'class-validator';

export class RescheduleAppointmentDto {
  @IsDateString({}, { message: 'newDate debe tener formato YYYY-MM-DD.' })
  @IsNotEmpty({ message: 'newDate es requerida.' })
  newDate: string;

  @Matches(/^([01]\d|2[0-3]):00$/, {
    message: 'newStartTime debe ser una hora en punto en formato HH:00 (ej. 11:00, 16:00).',
  })
  @IsNotEmpty({ message: 'newStartTime es requerido.' })
  newStartTime: string;
}
