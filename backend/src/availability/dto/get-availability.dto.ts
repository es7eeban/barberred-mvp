import { IsDateString, IsNotEmpty, IsUUID } from 'class-validator';

export class GetAvailabilityDto {
  @IsUUID(undefined, { message: 'barberId debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'barberId es requerido.' })
  barberId: string;

  @IsDateString({}, { message: 'date debe tener formato YYYY-MM-DD.' })
  @IsNotEmpty({ message: 'date es requerida.' })
  date: string;
}
