import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class SingleWorkingHourDto {
  @IsInt({ message: 'dayOfWeek debe ser un entero (0 = Domingo a 6 = Sábado).' })
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsInt({ message: 'startHour debe ser un entero entre 0 y 23.' })
  @Min(0)
  @Max(23)
  startHour: number;

  @IsInt({ message: 'endHour debe ser un entero entre 1 y 24.' })
  @Min(1)
  @Max(24)
  endHour: number;

  @IsBoolean({ message: 'isActive debe ser booleano.' })
  isActive: boolean;
}

export class UpdateWorkingHoursDto {
  @IsArray({ message: 'workingHours debe ser una lista de horarios.' })
  @ValidateNested({ each: true })
  @Type(() => SingleWorkingHourDto)
  @IsNotEmpty({ message: 'workingHours no puede estar vacío.' })
  workingHours: SingleWorkingHourDto[];
}
