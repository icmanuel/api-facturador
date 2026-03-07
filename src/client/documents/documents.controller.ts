import { Controller, Get, Post, Param, Query, ParseIntPipe, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import type { Response } from 'express';
import { ClientDocumentsService } from './documents.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DocStatus, SriDocTypeCode } from '../../entities/enums';

@ApiTags('Client - Documents')
@ApiBearerAuth()
@Controller('client/documents')
export class ClientDocumentsController {
  constructor(private readonly documentsService: ClientDocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar documentos de la cuenta' })
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: DocStatus })
  @ApiQuery({ name: 'typeCode', required: false, enum: SriDocTypeCode })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser('accountId') accountId: number,
    @Query('companyId') companyId?: number,
    @Query('status') status?: DocStatus,
    @Query('typeCode') typeCode?: SriDocTypeCode,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.documentsService.findAll(accountId, {
      companyId: companyId ? +companyId : undefined,
      status,
      typeCode,
      dateFrom,
      dateTo,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de documento' })
  findOne(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.documentsService.findOne(accountId, id);
  }

  @Get(':id/files/:fileType')
  @ApiOperation({ summary: 'Descargar archivo de documento (signed_xml, authorized_xml, ride)' })
  @ApiParam({ name: 'fileType', enum: ['signed_xml', 'authorized_xml', 'ride'] })
  async downloadFile(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('fileType') fileType: string,
    @Res() res: Response,
  ) {
    const { buffer, filename, contentType } = await this.documentsService.downloadFile(accountId, id, fileType);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post(':id/regenerate-ride')
  @ApiOperation({ summary: 'Regenerar RIDE (PDF) del documento' })
  async regenerateRide(
    @CurrentUser('accountId') accountId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.documentsService.regenerateRide(accountId, id);
  }
}
