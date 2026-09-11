import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AdminCancelAppointmentDto {
  @IsString({ message: 'El motivo debe ser texto.' })
  @IsNotEmpty({ message: 'El motivo de la cancelación administrativa es obligatorio.' })
  @MinLength(4, { message: 'El motivo debe tener al menos 4 caracteres.' })
  reason: string;
}
