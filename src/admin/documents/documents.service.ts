import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../../entities/document.entity';
import { DocumentFile } from '../../entities/document-file.entity';
import { DocStatus, SriDocTypeCode, CompanyEnv, DocFileType } from '../../entities/enums';
import { formatDateTz } from '../../common/utils/date.util';
import { S3StorageService } from '../../engine/storage/s3.service';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly repo: Repository<Document>,
    @InjectRepository(DocumentFile)
    private readonly fileRepo: Repository<DocumentFile>,
    private readonly s3Service: S3StorageService,
  ) {}

  async downloadFile(
    documentId: number,
    fileType: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const fileTypeMap: Record<string, DocFileType> = {
      signed_xml: DocFileType.SIGNED_XML,
      authorized_xml: DocFileType.AUTHORIZED_XML,
      ride: DocFileType.RIDE,
    };
    const docFileType = fileTypeMap[fileType];
    if (!docFileType) {
      throw new NotFoundException(`Tipo de archivo no válido: ${fileType}`);
    }

    const document = await this.repo.findOne({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Documento no encontrado');

    const file = await this.fileRepo.findOne({
      where: { documentId, type: docFileType },
    });
    if (!file) {
      throw new NotFoundException(`Archivo ${fileType} no encontrado para este documento`);
    }

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

  async findAll(
    page = 1,
    limit = 20,
    status?: DocStatus,
    companyId?: number,
    typeCode?: SriDocTypeCode,
    dateFrom?: string,
    dateTo?: string,
    env?: CompanyEnv,
    search?: string,
  ) {
    const qb = this.repo.createQueryBuilder('doc');
    qb.leftJoinAndSelect('doc.company', 'company');

    if (status) {
      qb.andWhere('doc.status = :status', { status });
    }
    if (companyId) {
      qb.andWhere('doc.companyId = :companyId', { companyId });
    }
    if (typeCode) {
      qb.andWhere('doc.typeCode = :typeCode', { typeCode });
    }
    if (dateFrom) {
      qb.andWhere('doc.createdAt >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      qb.andWhere('doc.createdAt <= :dateTo', { dateTo });
    }
    if (env) {
      qb.andWhere('doc.env = :env', { env });
    }
    if (search) {
      qb.andWhere(
        '(doc.accessKey ILIKE :search OR doc.buyerName ILIKE :search OR doc.buyerId ILIKE :search OR doc.sequential ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('doc.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      data: data.map((d) => this.formatDocument(d)),
      total, page, limit, totalPages: Math.ceil(total / limit),
    };
  }

  async getStats(): Promise<Record<string, number>> {
    const rows: { status: string; count: string }[] = await this.repo.query(
      `SELECT doc_status AS status, COUNT(*)::int AS count FROM app.document GROUP BY doc_status`,
    );
    const stats: Record<string, number> = {};
    for (const r of rows) {
      stats[r.status] = Number(r.count);
    }
    return stats;
  }

  async findOne(id: number) {
    const qb = this.repo.createQueryBuilder('doc');
    qb.leftJoinAndSelect('doc.company', 'company')
      .leftJoinAndSelect('doc.timeline', 'timeline')
      .leftJoinAndSelect('doc.errors', 'errors')
      .leftJoinAndSelect('doc.files', 'files')
      .where('doc.id = :id', { id })
      .addOrderBy('timeline.order', 'ASC');

    const doc = await qb.getOne();
    if (!doc) throw new NotFoundException('Documento no encontrado');

    const tz = doc.company?.timezone ?? 'America/Guayaquil';
    return {
      ...this.formatDocument(doc),
      timeline: (doc.timeline ?? []).map((t) => ({
        ...t,
        timestamp: formatDateTz(t.timestamp, tz),
      })),
      errors: doc.errors ?? [],
      files: (doc.files ?? []).map((f) => ({
        ...f,
        createdAt: formatDateTz(f.createdAt, tz),
      })),
    };
  }

  private formatDocument(doc: Document) {
    const tz = doc.company?.timezone ?? 'America/Guayaquil';
    return {
      ...doc,
      totalAmount: Number(doc.totalAmount),
      subtotal: Number(doc.subtotal),
      totalTax: Number(doc.totalTax),
      totalDiscount: Number(doc.totalDiscount),
      authAt: formatDateTz(doc.authAt, tz),
      receivedAt: formatDateTz(doc.receivedAt, tz),
      createdAt: formatDateTz(doc.createdAt, tz),
      updatedAt: formatDateTz(doc.updatedAt, tz),
    };
  }
}
