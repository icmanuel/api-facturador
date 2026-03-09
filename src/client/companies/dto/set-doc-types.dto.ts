import { IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SriDocTypeCode } from '../../../entities/enums';

export class SetDocTypesDto {
  @ApiProperty({
    description: 'Códigos de tipos de documento habilitados',
    enum: SriDocTypeCode,
    isArray: true,
    example: ['01', '04', '05', '07'],
  })
  @IsArray()
  @IsEnum(SriDocTypeCode, { each: true })
  codes: SriDocTypeCode[];
}
