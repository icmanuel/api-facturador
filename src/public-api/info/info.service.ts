import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../../entities/company.entity';
import { Certificate } from '../../entities/certificate.entity';
import { Document } from '../../entities/document.entity';

@Injectable()
export class InfoService {
  constructor(
    @InjectRepository(Certificate)
    private readonly certRepo: Repository<Certificate>,
    @InjectRepository(Document)
    private readonly docRepo: Repository<Document>,
  ) {}

  getCompanyInfo(company: Company) {
    return {
      id: company.id,
      name: company.name,
      tradeName: company.tradeName,
      ruc: company.ruc,
      environment: company.env,
      status: company.status,
      establishment: company.establishment,
      plan: company.plan ? {
        name: company.plan.name,
        tier: company.plan.tier,
        docLimit: company.plan.docLimit,
      } : null,
      overageEnabled: company.overageEnabled,
      timezone: company.timezone,
    };
  }

  async getCertificateInfo(companyId: number) {
    const cert = await this.certRepo.findOne({
      where: { companyId, isCurrent: true },
    });

    if (!cert) {
      return { hasCertificate: false, certificate: null };
    }

    const now = new Date();
    const expiresAt = cert.expiresAt ? new Date(cert.expiresAt) : null;
    const daysUntilExpiry = expiresAt
      ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      hasCertificate: true,
      certificate: {
        id: cert.id,
        subjectCn: cert.subjectCn,
        expiresAt: cert.expiresAt,
        daysUntilExpiry,
        isExpired: daysUntilExpiry !== null && daysUntilExpiry <= 0,
        isExpiringSoon: daysUntilExpiry !== null && daysUntilExpiry <= 30,
        uploadedAt: cert.uploadedAt,
      },
    };
  }

  async getUsageInfo(company: Company) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const docsThisMonth = await this.docRepo
      .createQueryBuilder('d')
      .where('d.companyId = :companyId', { companyId: company.id })
      .andWhere('d.createdAt >= :start', { start: startOfMonth })
      .andWhere('d.createdAt < :end', { end: endOfMonth })
      .getCount();

    const authorizedThisMonth = await this.docRepo
      .createQueryBuilder('d')
      .where('d.companyId = :companyId', { companyId: company.id })
      .andWhere('d.createdAt >= :start', { start: startOfMonth })
      .andWhere('d.createdAt < :end', { end: endOfMonth })
      .andWhere('d.status = :status', { status: 'AUTHORIZED' })
      .getCount();

    const plan = company.plan;
    const docLimit = plan?.docLimit ?? null;
    const overageEnabled = company.overageEnabled;

    return {
      period: {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      },
      docsTotal: docsThisMonth,
      docsAuthorized: authorizedThisMonth,
      plan: plan ? {
        name: plan.name,
        tier: plan.tier,
        docLimit,
        overageEnabled,
      } : null,
      remaining: docLimit ? Math.max(0, docLimit - docsThisMonth) : null,
      overLimit: docLimit ? docsThisMonth > docLimit : false,
      overageDocs: docLimit ? Math.max(0, docsThisMonth - docLimit) : 0,
    };
  }
}
