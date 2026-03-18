import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Company } from '../../entities/company.entity';
import { Certificate } from '../../entities/certificate.entity';
import { Document } from '../../entities/document.entity';
import { CertificatesService } from '../../admin/certificates/certificates.service';
import { CompanyEnv } from '../../entities/enums';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class InfoService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Certificate)
    private readonly certRepo: Repository<Certificate>,
    @InjectRepository(Document)
    private readonly docRepo: Repository<Document>,
    private readonly certificatesService: CertificatesService,
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

  /** Free test documents per month for all plans */
  static readonly TEST_DOC_LIMIT = 50;

  async getUsageInfo(company: Company) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const baseQuery = () =>
      this.docRepo
        .createQueryBuilder('d')
        .where('d.companyId = :companyId', { companyId: company.id })
        .andWhere('d.createdAt >= :start', { start: startOfMonth })
        .andWhere('d.createdAt < :end', { end: endOfMonth });

    const [prodTotal, prodAuthorized, testTotal] = await Promise.all([
      baseQuery().andWhere('d.env = :env', { env: 'production' }).getCount(),
      baseQuery().andWhere('d.env = :env', { env: 'production' }).andWhere('d.status = :status', { status: 'AUTHORIZED' }).getCount(),
      baseQuery().andWhere('d.env = :env', { env: 'test' }).getCount(),
    ]);

    const plan = company.plan;
    const docLimit = plan?.docLimit ?? null;
    const overageEnabled = company.overageEnabled;

    return {
      period: {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      },
      production: {
        docsTotal: prodTotal,
        docsAuthorized: prodAuthorized,
        remaining: docLimit ? Math.max(0, docLimit - prodTotal) : null,
        overLimit: docLimit ? prodTotal > docLimit : false,
        overageDocs: docLimit ? Math.max(0, prodTotal - docLimit) : 0,
      },
      test: {
        docsTotal: testTotal,
        limit: InfoService.TEST_DOC_LIMIT,
        remaining: Math.max(0, InfoService.TEST_DOC_LIMIT - testTotal),
      },
      plan: plan ? {
        name: plan.name,
        tier: plan.tier,
        docLimit,
        overageEnabled,
      } : null,
    };
  }

  // ── Self-management methods ──

  async updateEnvironment(companyId: number, env: CompanyEnv) {
    await this.companyRepo.update(companyId, { env });
    return { environment: env };
  }

  async updateSettings(companyId: number, dto: UpdateSettingsDto) {
    await this.companyRepo.update(companyId, dto as any);
    const company = await this.companyRepo.findOneByOrFail({ id: companyId });
    return {
      webhookUrl: company.webhookUrl,
      webhookSecret: company.webhookSecret ? '••••••' : null,
      notifyClient: company.notifyClient,
      notifyCompany: company.notifyCompany,
      notificationEmail: company.notificationEmail,
    };
  }

  async uploadCertificate(
    companyId: number,
    fileBuffer: Buffer,
    fileName: string,
    password: string,
  ) {
    return this.certificatesService.upload(companyId, fileBuffer, fileName, password, null);
  }

  async regenerateApiKey(companyId: number) {
    const apiKey = 'sk_' + randomBytes(32).toString('hex');
    await this.companyRepo.update(companyId, { apiKey });
    return { apiKey };
  }
}
