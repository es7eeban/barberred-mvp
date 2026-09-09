import { IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MinLength } from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID(undefined, { message: 'barberId debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'barberId es requerido.' })
  barberId: string;

  @IsDateString({}, { message: 'date debe tener formato YYYY-MM-DD.' })
  @IsNotEmpty({ message: 'date es requerida.' })
  date: string;

  @Matches(/^([01]\d|2[0-3]):00$/, {
    message: 'startTime debe ser una hora en punto en formato HH:00 (ej. 10:00, 15:00).',
  })
  @IsNotEmpty({ message: 'startTime es requerido.' })
  startTime: string;

  @IsString({ message: 'clientName debe ser texto.' })
  @MinLength(2, { message: 'clientName debe tener al menos 2 caracteres.' })
  @IsNotEmpty({ message: 'clientName es requerido.' })
  clientName: string;

  @IsString({ message: 'clientPhone debe ser texto.' })
  @MinLength(8, { message: 'clientPhone debe tener al menos 8 dígitos.' })
  @IsNotEmpty({ message: 'clientPhone es requerido.' })
  clientPhone: string;

  @IsOptional()
  @IsEmail({}, { message: 'clientEmail debe tener un formato de correo válido.' })
  clientEmail?: string;
}
