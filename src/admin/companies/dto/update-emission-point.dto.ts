import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateEmissionPointDto } from './create-emission-point.dto';

export class UpdateEmissionPointDto extends PartialType(
  CreateEmissionPointDto,
) {
  @ApiPropertyOptional({ description: 'Activar/desactivar punto de emisión' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
