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
    // Verify company belongs to account
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

    // Get account for warning message
    const account = await this.accountRepo.findOne({
      where: { id: accountId },
    });

    // Current month boundaries
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    // Docs this month
    const docsThisMonth = await this.documentRepo.count({
      where: {
        companyId,
        createdAt: Between(monthStart, monthEnd),
      },
    });

    // Docs rejected this month
    const docsRejected = await this.documentRepo.count({
      where: {
        companyId,
        status: DocStatus.REJECTED,
        createdAt: Between(monthStart, monthEnd),
      },
    });

    // Billing for current month
    const billing = await this.billingRepo.findOne({
      where: {
        accountId,
        year,
        month,
      },
    });

    // Latest certificate
    const certificate = await this.certificateRepo.findOne({
      where: { companyId, isCurrent: true },
      order: { uploadedAt: 'DESC' },
    });

    // Weekly chart: last 7 days
    const weeklyChart = await this.getWeeklyChart(companyId);

    return {
      company,
      docsThisMonth,
      docsRejected,
      billing: billing || null,
      certificate: certificate || null,
      weeklyChart,
      warningMessage: account?.warningMessage || null,
    };
  }

  private async getWeeklyChart(companyId: number) {
    const days: { date: string; count: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

      const count = await this.documentRepo.count({
        where: {
          companyId,
          createdAt: Between(dayStart, dayEnd),
        },
      });

      days.push({
        date: dayStart.toISOString().split('T')[0],
        count,
      });
    }

    return days;
  }
}
