import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmissionPointDto {
  @ApiProperty({
    description: 'Código del punto de emisión (3 dígitos)',
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  code: string;

  @ApiPropertyOptional({ description: 'Descripción del punto de emisión' })
  @IsOptional()
  @IsString()
  description?: string;
}
