import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { DocStatus, SriDocTypeCode, CompanyEnv } from '../../entities/enums';

@ApiTags('Admin - Documentos')
@ApiBearerAuth()
@Controller('admin/documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar documentos con filtros' })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'status', enum: DocStatus, required: false })
  @ApiQuery({ name: 'companyId', type: Number, required: false })
  @ApiQuery({ name: 'typeCode', enum: SriDocTypeCode, required: false })
  @ApiQuery({ name: 'dateFrom', type: String, required: false })
  @ApiQuery({ name: 'dateTo', type: String, required: false })
  @ApiQuery({ name: 'env', enum: CompanyEnv, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: DocStatus,
    @Query('companyId') companyId?: number,
    @Query('typeCode') typeCode?: SriDocTypeCode,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('env') env?: CompanyEnv,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(
      page,
      limit,
      status,
      companyId ? +companyId : undefined,
      typeCode,
      dateFrom,
      dateTo,
      env,
      search,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Conteo de documentos por estado' })
  getStats() {
    return this.service.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de documento' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}
