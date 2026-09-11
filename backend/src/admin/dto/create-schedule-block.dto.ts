import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreateScheduleBlockDto {
  @IsUUID('4', { message: 'El ID del barbero debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El ID del barbero es requerido.' })
  barberId: string;

  @IsDateString({}, { message: 'La fecha debe tener formato YYYY-MM-DD.' })
  @IsNotEmpty({ message: 'La fecha es requerida.' })
  date: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):00$/, {
    message: 'La hora de inicio debe tener formato HH:00 (ej. 14:00).',
  })
  startTime?: string;

  @IsOptional()
  @IsString({ message: 'El motivo debe ser texto.' })
  reason?: string;

  @IsBoolean({ message: 'isFullDay debe ser un valor booleano.' })
  @IsNotEmpty({ message: 'isFullDay es requerido.' })
  isFullDay: boolean;
}
