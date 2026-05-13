import { IsInt, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExtendTrialDto {
  @ApiProperty({ description: 'Días a extender el período de prueba', example: 15, minimum: 1, maximum: 365 })
  @IsInt()
  @Min(1)
  @Max(365)
  days: number;
}
