import {
  Controller, Get, Put, Post, Delete, Body, HttpCode, HttpStatus, Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SmtpService } from './smtp.service';
import { UpsertSmtpDto } from './dto/upsert-smtp.dto';

@ApiTags('Client - SMTP')
@ApiBearerAuth()
@Controller('client/smtp')
export class SmtpController {
  constructor(private readonly service: SmtpService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener configuración SMTP de la empresa activa' })
  get(@Req() req: any) {
    const companyId = req.user.activeCompanyId;
    return this.service.findByCompany(companyId);
  }

  @Put()
  @ApiOperation({ summary: 'Crear o actualizar configuración SMTP' })
  upsert(@Req() req: any, @Body() dto: UpsertSmtpDto) {
    const companyId = req.user.activeCompanyId;
    return this.service.upsert(companyId, dto);
  }

  @Post('test')
  @ApiOperation({ summary: 'Enviar email de prueba con la configuración SMTP' })
  test(@Req() req: any) {
    const companyId = req.user.activeCompanyId;
    const email = req.user.email;
    return this.service.testConnection(companyId, email);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar configuración SMTP (volver al servidor de la plataforma)' })
  remove(@Req() req: any) {
    const companyId = req.user.activeCompanyId;
    return this.service.remove(companyId);
  }
}
