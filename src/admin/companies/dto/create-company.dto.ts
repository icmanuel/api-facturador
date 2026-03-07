import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanyEnv, AccessKeyMode, SequentialMode } from '../../../entities/enums';

export class CreateCompanyDto {
  @ApiProperty({ description: 'ID de la cuenta propietaria' })
  @IsNumber()
  accountId: number;

  @ApiProperty({ description: 'ID del plan de suscripción' })
  @IsNumber()
  planId: number;

  @ApiProperty({ description: 'Razón social', maxLength: 300 })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Nombre comercial', maxLength: 300 })
  @IsOptional()
  @IsString()
  tradeName?: string;

  @ApiProperty({ description: 'RUC (13 dígitos)', minLength: 13, maxLength: 13 })
  @IsString()
  @Length(13, 13)
  ruc: string;

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

  @ApiPropertyOptional({
    description: 'Ambiente SRI',
    enum: CompanyEnv,
    default: CompanyEnv.TEST,
  })
  @IsOptional()
  @IsEnum(CompanyEnv)
  env?: CompanyEnv;

  @ApiPropertyOptional({
    description: 'Código de establecimiento (3 dígitos)',
    default: '001',
    minLength: 3,
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  establishment?: string;

  @ApiPropertyOptional({ description: 'URL del webhook de notificaciones' })
  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @ApiPropertyOptional({ description: 'Secret para firmar webhooks' })
  @IsOptional()
  @IsString()
  webhookSecret?: string;

  @ApiPropertyOptional({
    description: 'Modo de clave de acceso: "platform" = la plataforma genera la clave, "client" = el cliente la envía',
    enum: AccessKeyMode,
    default: AccessKeyMode.PLATFORM,
  })
  @IsOptional()
  @IsEnum(AccessKeyMode)
  accessKeyMode?: AccessKeyMode;

  @ApiPropertyOptional({
    description: 'Modo de secuencial: "platform" = la plataforma genera el secuencial, "client" = el cliente lo envía',
    enum: SequentialMode,
    default: SequentialMode.PLATFORM,
  })
  @IsOptional()
  @IsEnum(SequentialMode)
  sequentialMode?: SequentialMode;

  @ApiPropertyOptional({
    description: 'Permitir excedentes sobre el plan',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  overageEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Notificar al cliente final por email',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  notifyClient?: boolean;

  @ApiPropertyOptional({
    description: 'Notificar a la empresa por email',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  notifyCompany?: boolean;

  @ApiPropertyOptional({
    description: 'Zona horaria',
    default: 'America/Guayaquil',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Fecha de inicio de facturación (YYYY-MM-DD). Si no se envía, se usa la fecha actual.',
  })
  @IsOptional()
  @IsString()
  billingStartDate?: string;
}
