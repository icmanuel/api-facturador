import { IsEnum, IsInt, IsString, Matches, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SriDocTypeCode } from '../../../entities/enums';

export class SetSequentialDto {
  @ApiProperty({ description: 'Tipo de documento SRI', enum: SriDocTypeCode })
  @IsEnum(SriDocTypeCode)
  docType: SriDocTypeCode;

  @ApiProperty({ description: 'Código de establecimiento (3 dígitos)', example: '001' })
  @IsString()
  @Matches(/^\d{3}$/, { message: 'establishment debe ser numérico de 3 dígitos' })
  establishment: string;

  @ApiProperty({ description: 'Código de punto de emisión (3 dígitos)', example: '001' })
  @IsString()
  @Matches(/^\d{3}$/, { message: 'emissionPoint debe ser numérico de 3 dígitos' })
  emissionPoint: string;

  @ApiProperty({ description: 'Siguiente secuencial a usar (mínimo 1)', example: 1 })
  @IsInt()
  @Min(1, { message: 'nextSequential debe ser al menos 1' })
  nextSequential: number;
}
