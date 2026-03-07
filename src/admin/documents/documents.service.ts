import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../../entities/document.entity';
import { DocStatus, SriDocTypeCode, CompanyEnv } from '../../entities/enums';
import { formatDateTz } from '../../common/utils/date.util';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly repo: Repository<Document>,
  ) {}

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
