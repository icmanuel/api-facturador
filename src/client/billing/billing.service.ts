import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { BillingPeriod } from '../../entities/billing-period.entity';
import { Payment } from '../../entities/payment.entity';
import { Company } from '../../entities/company.entity';
import { Document } from '../../entities/document.entity';
import { Account } from '../../entities/account.entity';
import { DocStatus } from '../../entities/enums';

@Injectable()
export class ClientBillingService {
  constructor(
    @InjectRepository(BillingPeriod)
    private readonly billingRepo: Repository<BillingPeriod>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
  ) {}

  async getBillingSummary(accountId: number, companyId: number) {
    // Verify company belongs to account
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
      relations: ['plan'],
    });
    if (!company || company.accountId !== accountId) {
      throw new ForbiddenException('No tiene acceso a esta empresa');
    }

    const account = await this.accountRepo.findOne({ where: { id: accountId } });

    // Current month usage
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    const [docsThisMonth, docsAuthorized, docsRejected] = await Promise.all([
      this.documentRepo.count({
        where: { companyId, createdAt: Between(monthStart, monthEnd) },
      }),
      this.documentRepo.count({
        where: { companyId, status: DocStatus.AUTHORIZED, createdAt: Between(monthStart, monthEnd) },
      }),
      this.documentRepo.count({
        where: { companyId, status: DocStatus.REJECTED, createdAt: Between(monthStart, monthEnd) },
      }),
    ]);

    // Current billing period
    const currentPeriod = await this.billingRepo.findOne({
      where: { accountId, year, month },
      relations: ['plan'],
    });

    // All billing periods for history (last 12 months)
    const periods = await this.billingRepo.find({
      where: { accountId },
      relations: ['plan', 'payments'],
      order: { year: 'DESC', month: 'DESC' },
      take: 12,
    });

    // Debt: sum of unpaid periods
    const unpaidPeriods = periods.filter((p) => p.status !== 'paid');
    const totalDebt = unpaidPeriods.reduce((sum, p) => sum + Number(p.total) - Number(p.paidAmount), 0);

    // Plan info
    const plan = company.plan;
    const docLimit = plan?.docLimit ?? null;
    const usagePercent = docLimit ? Math.min((docsThisMonth / docLimit) * 100, 100) : null;
    const overageDocs = docLimit && docsThisMonth > docLimit ? docsThisMonth - docLimit : 0;

    return {
      // Plan
      plan: plan ? {
        id: plan.id,
        name: plan.name,
        tier: plan.tier,
        monthlyPrice: plan.monthlyPrice,
        docLimit: plan.docLimit,
        overagePrice: plan.overagePrice,
        features: plan.features,
      } : null,

      // Current month usage
      usage: {
        docsThisMonth,
        docsAuthorized,
        docsRejected,
        docLimit,
        usagePercent,
        overageDocs,
        overageEnabled: company.overageEnabled,
      },

      // Current period billing
      currentPeriod: currentPeriod ? this.formatPeriod(currentPeriod) : null,

      // Billing history
      history: periods.map((p) => this.formatPeriod(p)),

      // Debt summary
      debt: {
        total: totalDebt,
        unpaidPeriods: unpaidPeriods.length,
      },

      // Account info
      warningMessage: account?.warningMessage || null,
    };
  }

  private formatPeriod(p: BillingPeriod) {
    return {
      id: p.id,
      year: p.year,
      month: p.month,
      label: `${String(p.month).padStart(2, '0')}/${p.year}`,
      docsTotal: p.docsTotal,
      docsAuthorized: p.docsAuthorized,
      docLimit: p.docLimit,
      basePrice: Number(p.basePrice),
      overageDocs: p.overageDocs,
      overagePrice: Number(p.overagePrice),
      overageTotal: Number(p.overageTotal),
      total: Number(p.total),
      paidAmount: Number(p.paidAmount),
      balance: Number(p.total) - Number(p.paidAmount),
      status: p.status,
      paidAt: p.paidAt,
      planName: p.plan?.name || null,
      payments: (p.payments || []).map((pay) => ({
        id: pay.id,
        amount: Number(pay.amount),
        method: pay.method,
        reference: pay.reference,
        date: pay.date,
      })),
    };
  }
}

