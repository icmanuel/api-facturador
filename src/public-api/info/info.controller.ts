import {
  Controller, Get, Put, Post, Patch, Body, UseGuards,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { CurrentCompany } from '../guards/current-company.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Company } from '../../entities/company.entity';
import { InfoService } from './info.service';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UploadCertificateDto } from '../../client/companies/dto/upload-certificate.dto';

@ApiTags('API Pública - Empresa')
@ApiSecurity('api-key')
@Public()
@UseGuards(ApiKeyGuard)
@Controller('company')
export class InfoController {
  constructor(private readonly service: InfoService) {}

  // ── Read ──

  @Get()
  @ApiOperation({ summary: 'Información de la empresa autenticada' })
  getCompany(@CurrentCompany() company: Company) {
    return this.service.getCompanyInfo(company);
  }

  @Get('certificate')
  @ApiOperation({ summary: 'Estado del certificado digital' })
  getCertificate(@CurrentCompany('id') companyId: number) {
    return this.service.getCertificateInfo(companyId);
  }

  @Get('usage')
  @ApiOperation({ summary: 'Uso de documentos del mes actual vs límite del plan' })
  getUsage(@CurrentCompany() company: Company) {
    return this.service.getUsageInfo(company);
  }

  // ── Self-management ──

  @Put('environment')
  @ApiOperation({ summary: 'Cambiar ambiente SRI (test/production)' })
  updateEnvironment(
    @CurrentCompany('id') companyId: number,
    @Body() dto: UpdateEnvironmentDto,
  ) {
    return this.service.updateEnvironment(companyId, dto.env);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Actualizar configuración (webhook, notificaciones)' })
  updateSettings(
    @CurrentCompany('id') companyId: number,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.service.updateSettings(companyId, dto);
  }

  @Post('certificate')
  @ApiOperation({ summary: 'Subir certificado de firma electrónica (.p12)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.originalname.toLowerCase().endsWith('.p12')) {
          cb(new BadRequestException('Solo se permiten archivos .p12'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadCertificate(
    @CurrentCompany('id') companyId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadCertificateDto,
  ) {
    if (!file) throw new BadRequestException('Archivo .p12 requerido');
    return this.service.uploadCertificate(companyId, file.buffer, file.originalname, dto.password);
  }

  @Post('regenerate-key')
  @ApiOperation({ summary: 'Regenerar API Key de la empresa (invalida la anterior)' })
  regenerateApiKey(@CurrentCompany('id') companyId: number) {
    return this.service.regenerateApiKey(companyId);
  }
}
