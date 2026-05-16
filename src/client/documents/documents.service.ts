import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between, FindOptionsWhere } from 'typeorm';
import { Document } from '../../entities/document.entity';
import { DocumentFile } from '../../entities/document-file.entity';
import { Company } from '../../entities/company.entity';
import { DocStatus, SriDocTypeCode, DocFileType } from '../../entities/enums';
import { S3StorageService } from '../../engine/storage/s3.service';
import { DocumentProcessingService } from '../../engine/processing/document-processing.service';
import { formatDateTz } from '../../common/utils/date.util';

@Injectable()
export class ClientDocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(DocumentFile)
    private readonly fileRepo: Repository<DocumentFile>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly s3Service: S3StorageService,
    private readonly processingService: DocumentProcessingService,
  ) {}

  async findAll(
    accountId: number,
    query: {
      companyId?: number;
      status?: DocStatus;
      typeCode?: SriDocTypeCode;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // Get company IDs belonging to this account
    const companyWhere: FindOptionsWhere<Company> = { accountId };
    if (query.companyId) {
      companyWhere.id = query.companyId;
    }

    const companies = await this.companyRepo.find({
      where: companyWhere,
      select: ['id'],
    });

    const companyIds = companies.map((c) => c.id);
    if (companyIds.length === 0) {
      return { data: [], total: 0, page, totalPages: 0 };
    }

    // Build document query
    const where: FindOptionsWhere<Document> = {
      companyId: In(companyIds),
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.typeCode) {
      where.typeCode = query.typeCode;
    }

    if (query.dateFrom && query.dateTo) {
      where.issueDate = Between(new Date(query.dateFrom), new Date(query.dateTo));
    }

    const [data, total] = await this.documentRepo.findAndCount({
      where,
      relations: ['company'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: data.map((d) => this.formatDocument(d)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(accountId: number, documentId: number) {
    const document = await this.documentRepo.findOne({
      where: { id: documentId },
      relations: ['company', 'timeline', 'errors', 'files'],
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    // Verify the document's company belongs to this account
    const company = await this.companyRepo.findOne({
      where: { id: document.companyId, accountId },
    });

    if (!company) {
      throw new ForbiddenException('No tiene acceso a este documento');
    }

    const tz = document.company?.timezone ?? 'America/Guayaquil';
    return {
      ...this.formatDocument(document),
      timeline: (document.timeline ?? [])
        .sort((a, b) => a.order - b.order)
        .map((t) => ({ ...t, timestamp: formatDateTz(t.timestamp, tz) })),
      errors: document.errors ?? [],
      files: (document.files ?? []).map((f) => ({
        ...f,
        createdAt: formatDateTz(f.createdAt, tz),
      })),
    };
  }

  private formatDocument(doc: Document) {
    const tz = doc.company?.timezone ?? 'America/Guayaquil';
    return {
      id: doc.id,
      companyId: doc.companyId,
      typeCode: doc.typeCode,
      sequential: doc.sequential,
      accessKey: doc.accessKey,
      status: doc.status,
      env: doc.env,
      issueDate: doc.issueDate,
      totalAmount: Number(doc.totalAmount),
      subtotal: Number(doc.subtotal),
      totalTax: Number(doc.totalTax),
      totalDiscount: Number(doc.totalDiscount),
      buyerName: doc.buyerName,
      buyerIdType: doc.buyerIdType,
      buyerId: doc.buyerId,
      establishment: doc.establishment,
      emissionPoint: doc.emissionPoint,
      retries: doc.retries,
      processingTimeMs: doc.processingTimeMs,
      authNumber: doc.authNumber,
      authAt: formatDateTz(doc.authAt, tz),
      receivedAt: formatDateTz(doc.receivedAt, tz),
      createdAt: formatDateTz(doc.createdAt, tz),
      nextRetryAt: (doc.payload as any)?._systemRetry?.nextAt ?? null,
      systemRetryAttempt: (doc.payload as any)?._systemRetry?.attempts ?? 0,
      systemRetryMax: (doc.payload as any)?._systemRetry?.max ?? null,
      company: doc.company ? {
        id: doc.company.id,
        name: doc.company.name,
        ruc: doc.company.ruc,
      } : undefined,
    };
  }

  async regenerateRide(accountId: number, documentId: number) {
    const document = await this.documentRepo.findOne({
      where: { id: documentId },
      relations: ['company'],
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    const company = await this.companyRepo.findOne({
      where: { id: document.companyId, accountId },
    });

    if (!company) {
      throw new ForbiddenException('No tiene acceso a este documento');
    }

    await this.processingService.regenerateRide(documentId);

    return { message: 'RIDE regenerado exitosamente' };
  }

  async reissueToday(accountId: number, documentId: number) {
    const document = await this.documentRepo.findOne({
      where: { id: documentId },
      relations: ['company'],
    });
    if (!document) throw new NotFoundException('Documento no encontrado');

    const company = await this.companyRepo.findOne({
      where: { id: document.companyId, accountId },
    });
    if (!company) throw new ForbiddenException('No tiene acceso a este documento');

    return this.processingService.reissueToday(documentId);
  }

  async downloadFile(accountId: number, documentId: number, fileType: string): Promise<{
    buffer: Buffer;
    filename: string;
    contentType: string;
  }> {
    const fileTypeMap: Record<string, DocFileType> = {
      signed_xml: DocFileType.SIGNED_XML,
      authorized_xml: DocFileType.AUTHORIZED_XML,
      ride: DocFileType.RIDE,
    };

    const docFileType = fileTypeMap[fileType];
    if (!docFileType) {
      throw new NotFoundException(`Tipo de archivo no valido: ${fileType}`);
    }

    // Verify document access
    const document = await this.documentRepo.findOne({
      where: { id: documentId },
      relations: ['company'],
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    const company = await this.companyRepo.findOne({
      where: { id: document.companyId, accountId },
    });

    if (!company) {
      throw new ForbiddenException('No tiene acceso a este documento');
    }

    // Find the file record
    const file = await this.fileRepo.findOne({
      where: { documentId, type: docFileType },
    });

    if (!file) {
      throw new NotFoundException(`Archivo ${fileType} no encontrado para este documento`);
    }

    // Download from S3
    const buffer = await this.s3Service.download(file.s3Key);

    const extensions: Record<string, { ext: string; mime: string }> = {
      signed_xml: { ext: 'xml', mime: 'application/xml' },
      authorized_xml: { ext: 'xml', mime: 'application/xml' },
      ride: { ext: 'pdf', mime: 'application/pdf' },
    };
    const { ext, mime } = extensions[fileType];

    const docTypePrefix: Record<string, string> = {
      '01': 'FAC', '03': 'LIQ', '04': 'NC', '05': 'ND', '06': 'GR', '07': 'RET',
    };
    const typeLabel = docTypePrefix[document.typeCode] || 'DOC';
    const suffix = fileType === 'ride' ? '' : fileType === 'authorized_xml' ? '_AUT' : '_FIR';
    const filename = `${typeLabel}_${document.accessKey}${suffix}.${ext}`;

    return { buffer, filename, contentType: mime };
  }
}
