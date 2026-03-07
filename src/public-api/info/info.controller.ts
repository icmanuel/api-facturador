import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { CurrentCompany } from '../guards/current-company.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Company } from '../../entities/company.entity';
import { InfoService } from './info.service';

@ApiTags('API Pública - Info')
@ApiSecurity('api-key')
@Public()
@UseGuards(ApiKeyGuard)
@Controller('company')
export class InfoController {
  constructor(private readonly service: InfoService) {}

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
}
