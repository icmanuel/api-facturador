import { IsOptional, IsString, IsBoolean, IsUrl, IsEmail, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ description: 'URL del webhook para notificaciones de documentos (HTTPS)' })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'webhookUrl debe ser una URL HTTPS válida' })
  webhookUrl?: string;

  @ApiPropertyOptional({ description: 'Secret para verificar firma HMAC-SHA256 del webhook' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  webhookSecret?: string;

  @ApiPropertyOptional({ description: 'Notificar al comprador por email cuando se autoriza un documento' })
  @IsOptional()
  @IsBoolean()
  notifyClient?: boolean;

  @ApiPropertyOptional({ description: 'Notificar a la empresa por email cuando se autoriza un documento' })
  @IsOptional()
  @IsBoolean()
  notifyCompany?: boolean;

  @ApiPropertyOptional({ description: 'Email de la empresa para notificaciones' })
  @IsOptional()
  @IsEmail({}, { message: 'notificationEmail debe ser un email válido' })
  notificationEmail?: string;
}
