import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCompanyRucDto {
  @ApiProperty({ description: 'Nuevo RUC de la empresa (13 dígitos)', example: '1790012345001' })
  @IsString()
  @Length(13, 13, { message: 'El RUC debe tener exactamente 13 dígitos' })
  @Matches(/^\d{13}$/, { message: 'El RUC debe contener solo dígitos' })
  ruc: string;
}
