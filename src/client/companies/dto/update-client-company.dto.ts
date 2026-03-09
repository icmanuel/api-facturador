import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, IsUrl, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AccessKeyMode, CompanyEnv, SequentialMode } from '../../../entities/enums';

export class UpdateClientCompanyDto {
  @ApiPropertyOptional({ description: 'Razón social', maxLength: 300 })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Nombre comercial', maxLength: 300 })
  @IsOptional()
  @IsString()
  tradeName?: string;

  @ApiPropertyOptional({ description: 'Dirección principal' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Correo electrónico' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Teléfono', maxLength: 30 })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Código de establecimiento (3 dígitos)', example: '001' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  establishment?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  notifyClient?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  notifyCompany?: boolean;

  @ApiPropertyOptional({ description: 'Correo para notificaciones (errores, alertas de firma, etc.)' })
  @IsOptional()
  @IsEmail()
  notificationEmail?: string;

  @ApiPropertyOptional({ description: 'Permitir excedentes sobre el plan', default: false })
  @IsOptional()
  @IsBoolean()
  overageEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Ambiente SRI', enum: CompanyEnv })
  @IsOptional()
  @IsEnum(CompanyEnv)
  env?: CompanyEnv;

  @ApiPropertyOptional({ example: 'https://miempresa.com/webhook' })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'webhookUrl debe ser una URL válida' })
  webhookUrl?: string;

  @ApiPropertyOptional({ example: 'mi_secret_123' })
  @IsOptional()
  @IsString()
  webhookSecret?: string;

  @ApiPropertyOptional({
    description: 'Modo de clave de acceso: "platform" = la plataforma genera, "client" = el cliente la envía',
    enum: AccessKeyMode,
  })
  @IsOptional()
  @IsEnum(AccessKeyMode)
  accessKeyMode?: AccessKeyMode;

  @ApiPropertyOptional({
    description: 'Modo de secuencial: "platform" = la plataforma genera, "client" = el cliente lo envía',
    enum: SequentialMode,
  })
  @IsOptional()
  @IsEnum(SequentialMode)
  sequentialMode?: SequentialMode;
}
