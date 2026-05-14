import { IsString, IsEmail, IsOptional, Length, MinLength, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanTier } from '../../entities/enums';

export class RegisterDto {
  @ApiProperty({ description: 'Nombre de la empresa o cuenta', example: 'Mi Empresa S.A.' })
  @IsString()
  accountName: string;

  @ApiProperty({ description: 'RUC de la empresa (13 dígitos)', example: '0991234567001' })
  @IsString()
  @Length(13, 13, { message: 'El RUC debe tener exactamente 13 dígitos' })
  ruc: string;

  @ApiProperty({ description: 'Email de contacto (será el email de la cuenta y del usuario admin)', example: 'admin@miempresa.com' })
  @IsEmail({}, { message: 'Ingrese un email válido' })
  email: string;

  @ApiPropertyOptional({ description: 'Teléfono de contacto' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Nombre del usuario administrador', example: 'Juan Pérez' })
  @IsString()
  adminName: string;

  @ApiProperty({ description: 'Contraseña (mínimo 6 caracteres)', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiPropertyOptional({
    description: 'Tier del plan a asignar (basic, professional, enterprise, payperuse). Por defecto basic.',
    enum: PlanTier,
  })
  @IsOptional()
  @IsEnum(PlanTier)
  planTier?: PlanTier;
}
