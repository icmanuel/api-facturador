import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Company } from '../../entities/company.entity';
import { Document } from '../../entities/document.entity';
import { BillingPeriod } from '../../entities/billing-period.entity';
import { Certificate } from '../../entities/certificate.entity';
import { Account } from '../../entities/account.entity';
import { DocStatus } from '../../entities/enums';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const DOC_TYPE_LABELS: Record<string, string> = {
  '01': 'Factura',
  '03': 'Liq. Compras',
  '04': 'Nota Crédito',
  '05': 'Nota Débito',
  '06': 'Guía Remisión',
  '07': 'Retención',
};

@Injectable()
export class ClientDashboardService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(BillingPeriod)
    private readonly billingRepo: Repository<BillingPeriod>,
    @InjectRepository(Certificate)
    private readonly certificateRepo: Repository<Certificate>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
  ) {}

  async getDashboard(accountId: number, companyId: number) {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
      relations: ['plan'],
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }
    if (company.accountId !== accountId) {
      throw new ForbiddenException('No tiene acceso a esta empresa');
    }

    const account = await this.accountRepo.findOne({
      where: { id: accountId },
    });

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [
      docsThisMonth,
      docsRejected,
      docsAuthorized,
      billing,
      certificate,
      weeklyChart,
      docTypeDistributionRaw,
      totalAmountThisMonth,
      docsToday,
      avgLatencyResult,
      accountSummary,
    ] = await Promise.all([
      this.documentRepo.count({
        where: { companyId, createdAt: Between(monthStart, monthEnd) },
      }),
      this.documentRepo.count({
        where: {
          companyId,
          status: DocStatus.REJECTED,
          createdAt: Between(monthStart, monthEnd),
        },
      }),
      this.documentRepo.count({
        where: {
          companyId,
          status: DocStatus.AUTHORIZED,
          createdAt: Between(monthStart, monthEnd),
        },
      }),
      this.billingRepo.findOne({ where: { accountId, year, month } }),
      this.certificateRepo.findOne({
        where: { companyId, isCurrent: true },
        order: { uploadedAt: 'DESC' },
      }),
      this.getWeeklyChart(companyId),

      // Doc type distribution
      this.documentRepo.query(
        `SELECT doc_type_code as code, COUNT(*) as count,
                COALESCE(SUM(doc_total_amount), 0) as amount
         FROM app.document
         WHERE com_id = $1
           AND doc_created_at >= $2 AND doc_created_at <= $3
         GROUP BY doc_type_code
         ORDER BY count DESC`,
        [companyId, monthStart, monthEnd],
      ),

      // Total amount authorized this month
      this.documentRepo
        .createQueryBuilder('doc')
        .select('COALESCE(SUM(doc.totalAmount), 0)', 'total')
        .where('doc.companyId = :companyId', { companyId })
        .andWhere(
          'doc.createdAt >= :monthStart AND doc.createdAt <= :monthEnd',
          { monthStart, monthEnd },
        )
        .andWhere('doc.status = :status', { status: DocStatus.AUTHORIZED })
        .getRawOne()
        .then((r) => Number(r?.total ?? 0)),

      // Docs today
      this.documentRepo.count({
        where: { companyId, createdAt: Between(todayStart, now) },
      }),

      // Avg processing time
      this.documentRepo
        .query(
          `SELECT AVG(sub.doc_processing_time_ms) as avg
           FROM (
             SELECT doc_processing_time_ms FROM app.document
             WHERE com_id = $1 AND doc_processing_time_ms IS NOT NULL
             ORDER BY doc_created_at DESC
             LIMIT 50
           ) sub`,
          [companyId],
        )
        .then((rows) => rows[0] ?? { avg: null }),

      // Account-level summary
      this.getAccountSummary(accountId, monthStart, monthEnd),
    ]);

    const docTypeDistribution = (docTypeDistributionRaw || []).map(
      (row: { code: string; count: string; amount: string }) => ({
        code: row.code,
        label: DOC_TYPE_LABELS[row.code] || row.code,
        count: Number(row.count),
        amount: Number(row.amount),
      }),
    );

    const avgMs = avgLatencyResult?.avg ? Number(avgLatencyResult.avg) : 0;

    return {
      company,
      docsThisMonth,
      docsRejected,
      docsAuthorized,
      docsToday,
      totalAmountThisMonth,
      avgProcessingMs: Math.round(avgMs),
      billing: billing || null,
      certificate: certificate || null,
      weeklyChart,
      docTypeDistribution,
      warningMessage: account?.warningMessage || null,
      accountSummary,
    };
  }

  private async getWeeklyChart(companyId: number) {
    const now = new Date();
    const days: { name: string; date: string; docs: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );
      const dayEnd = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        23,
        59,
        59,
        999,
      );

      const count = await this.documentRepo.count({
        where: { companyId, createdAt: Between(dayStart, dayEnd) },
      });

      days.push({
        name: DAY_NAMES[dayStart.getDay()],
        date: dayStart.toISOString().split('T')[0],
        docs: count,
      });
    }

    return days;
  }

  private async getAccountSummary(
    accountId: number,
    monthStart: Date,
    monthEnd: Date,
  ) {
    const companies = await this.companyRepo.find({
      where: { accountId, isActive: true },
      select: ['id', 'name', 'ruc'],
    });

    if (companies.length <= 1) return null;

    const companyIds = companies.map((c) => c.id);

    const [totalDocs, totalRejected, totalAmountResult] = await Promise.all([
      this.documentRepo
        .createQueryBuilder('doc')
        .where('doc.companyId IN (:...ids)', { ids: companyIds })
        .andWhere(
          'doc.createdAt >= :monthStart AND doc.createdAt <= :monthEnd',
          { monthStart, monthEnd },
        )
        .getCount(),
      this.documentRepo
        .createQueryBuilder('doc')
        .where('doc.companyId IN (:...ids)', { ids: companyIds })
        .andWhere('doc.status = :status', { status: DocStatus.REJECTED })
        .andWhere(
          'doc.createdAt >= :monthStart AND doc.createdAt <= :monthEnd',
          { monthStart, monthEnd },
        )
        .getCount(),
      this.documentRepo
        .createQueryBuilder('doc')
        .select('COALESCE(SUM(doc.totalAmount), 0)', 'total')
        .where('doc.companyId IN (:...ids)', { ids: companyIds })
        .andWhere('doc.status = :status', { status: DocStatus.AUTHORIZED })
        .andWhere(
          'doc.createdAt >= :monthStart AND doc.createdAt <= :monthEnd',
          { monthStart, monthEnd },
        )
        .getRawOne()
        .then((r) => Number(r?.total ?? 0)),
    ]);

    return {
      totalCompanies: companies.length,
      totalDocs,
      totalRejected,
      totalAmount: totalAmountResult,
    };
  }
}
