import { IsOptional, IsString } from 'class-validator';

export class CancelAppointmentDto {
  @IsOptional()
  @IsString({ message: 'reason debe ser una cadena de texto.' })
  reason?: string;
}
