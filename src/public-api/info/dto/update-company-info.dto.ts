import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCompanyInfoDto {
  @ApiPropertyOptional({ description: 'Razón social', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  name?: string;

  @ApiPropertyOptional({ description: 'Nombre comercial', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  tradeName?: string;

  @ApiPropertyOptional({ description: 'Correo electrónico de la empresa' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Teléfono', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: 'Dirección principal' })
  @IsOptional()
  @IsString()
  address?: string;
}
