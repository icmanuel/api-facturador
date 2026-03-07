import {
  Controller, Post, Put, Body, Param, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiSecurity, ApiParam, ApiBody,
  ApiResponse, ApiExtraModels,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { CurrentCompany } from '../guards/current-company.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Company } from '../../entities/company.entity';
import { XmlDocumentsService } from './xml-documents.service';
import { CreateXmlDocumentDto } from './dto/create-xml-document.dto';

@ApiTags('API Pública - Documentos XML')
@ApiSecurity('api-key')
@ApiExtraModels(CreateXmlDocumentDto)
@Public()
@UseGuards(ApiKeyGuard)
@Controller('documents/xml')
export class XmlDocumentsController {
  constructor(private readonly service: XmlDocumentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Enviar documento XML (procesamiento asíncrono)',
    description:
      'Recibe un XML SRI sin firmar (generado por su ERP), lo valida, extrae la metadata ' +
      '(claveAcceso, RUC, totales, comprador), lo firma con el certificado digital de la empresa ' +
      'y lo encola para procesamiento (firma → envío SRI → autorización).\n\n' +
      'Soporta: factura, notaCredito, notaDebito, comprobanteRetencion, guiaRemision, liquidacionCompra.\n\n' +
      'El RUC y ambiente del XML deben coincidir con los de la empresa autenticada.',
  })
  @ApiBody({ type: CreateXmlDocumentDto })
  @ApiResponse({ status: 201, description: 'Documento creado y encolado para procesamiento.' })
  @ApiResponse({ status: 400, description: 'XML inválido, sin infoTributaria, RUC no coincide, o certificado inactivo.' })
  @ApiResponse({ status: 409, description: 'Documento duplicado (mismo XML ya enviado).' })
  @ApiResponse({ status: 403, description: 'Límite del plan alcanzado o cuenta desactivada.' })
  create(
    @CurrentCompany() company: Company,
    @Body() dto: CreateXmlDocumentDto,
  ) {
    return this.service.create(company, dto);
  }

  @Post('emit')
  @ApiOperation({
    summary: 'Emitir documento XML (procesamiento síncrono)',
    description:
      'Recibe un XML SRI sin firmar, lo firma, envía al SRI y espera la autorización en la misma petición HTTP.\n\n' +
      'Si el procesamiento falla, el documento se encola automáticamente para reintento.\n\n' +
      'Tiempo de respuesta típico: 5-15 segundos. Para alto volumen, use POST /documents/xml (asíncrono).',
  })
  @ApiBody({ type: CreateXmlDocumentDto })
  @ApiResponse({ status: 200, description: 'Documento procesado. Ver campo "procesamiento" para resultado.' })
  @ApiResponse({ status: 400, description: 'XML inválido o requisitos no cumplidos.' })
  @ApiResponse({ status: 409, description: 'Documento duplicado.' })
  createSync(
    @CurrentCompany() company: Company,
    @Body() dto: CreateXmlDocumentDto,
  ) {
    return this.service.createSync(company, dto);
  }

  @Put(':claveAcceso')
  @ApiOperation({
    summary: 'Corregir documento XML y reprocesar (asíncrono)',
    description:
      'Reemplaza el XML de un documento en estado CREATED, REJECTED o FAILED, ' +
      'identificándolo por la clave de acceso del documento original (49 dígitos).\n\n' +
      'Limpia el historial anterior (timeline, errores, archivos) y lo encola para reprocesamiento.\n\n' +
      'El nuevo XML puede tener una clave de acceso diferente si el documento fue rechazado ' +
      '(la clave original queda "quemada" en el SRI).',
  })
  @ApiParam({
    name: 'claveAcceso',
    description: 'Clave de acceso del documento original (49 dígitos)',
    example: '0603202601070641016400110010010000000151234567813',
  })
  @ApiBody({ type: CreateXmlDocumentDto })
  @ApiResponse({ status: 200, description: 'Documento corregido y encolado.' })
  @ApiResponse({ status: 400, description: 'XML inválido o RUC no coincide.' })
  @ApiResponse({ status: 404, description: 'Documento no encontrado.' })
  @ApiResponse({ status: 409, description: 'Documento no corregible (ya autorizado o en procesamiento).' })
  correct(
    @CurrentCompany() company: Company,
    @Param('claveAcceso') accessKey: string,
    @Body() dto: CreateXmlDocumentDto,
  ) {
    return this.service.correct(company, accessKey, dto);
  }

  @Put(':claveAcceso/emit')
  @ApiOperation({
    summary: 'Corregir documento XML y reprocesar (síncrono)',
    description:
      'Reemplaza el XML de un documento en estado CREATED, REJECTED o FAILED ' +
      'y lo reprocesa de forma síncrona (firma → SRI → autorización).\n\n' +
      'Combina corrección + procesamiento en una sola llamada.',
  })
  @ApiParam({
    name: 'claveAcceso',
    description: 'Clave de acceso del documento original (49 dígitos)',
    example: '0603202601070641016400110010010000000151234567813',
  })
  @ApiBody({ type: CreateXmlDocumentDto })
  @ApiResponse({ status: 200, description: 'Documento corregido y procesado. Ver campo "procesamiento".' })
  @ApiResponse({ status: 400, description: 'XML inválido o RUC no coincide.' })
  @ApiResponse({ status: 404, description: 'Documento no encontrado.' })
  @ApiResponse({ status: 409, description: 'Documento no corregible.' })
  correctSync(
    @CurrentCompany() company: Company,
    @Param('claveAcceso') accessKey: string,
    @Body() dto: CreateXmlDocumentDto,
  ) {
    return this.service.correctSync(company, accessKey, dto);
  }
}
