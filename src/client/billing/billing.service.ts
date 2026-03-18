import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { BillingPeriod } from '../../entities/billing-period.entity';
import { BillingCompanyDetail } from '../../entities/billing-company-detail.entity';
import { Payment } from '../../entities/payment.entity';
import { Company } from '../../entities/company.entity';
import { Document } from '../../entities/document.entity';
import { Account } from '../../entities/account.entity';
import { DocStatus, AccountType } from '../../entities/enums';

@Injectable()
export class ClientBillingService {
  constructor(
    @InjectRepository(BillingPeriod)
    private readonly billingRepo: Repository<BillingPeriod>,
    @InjectRepository(BillingCompanyDetail)
    private readonly billingDetailRepo: Repository<BillingCompanyDetail>,
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

  async getAccountBilling(accountId: number) {
    const account = await this.accountRepo.findOne({ where: { id: accountId } });
    if (!account) {
      throw new NotFoundException('Cuenta no encontrada');
    }
    if (account.type !== AccountType.MULTI) {
      throw new BadRequestException(
        'La facturación consolidada solo está disponible para cuentas multi-empresa',
      );
    }

    const companies = await this.companyRepo.find({
      where: { accountId, isActive: true },
      relations: ['plan'],
    });

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    // Current billing period (per-account)
    const currentPeriod = await this.billingRepo.findOne({
      where: { accountId, year, month },
      relations: ['plan', 'payments'],
    });

    // Billing history (last 12 months)
    const periods = await this.billingRepo.find({
      where: { accountId },
      relations: ['plan', 'payments'],
      order: { year: 'DESC', month: 'DESC' },
      take: 12,
    });

    // Debt
    const unpaidPeriods = periods.filter((p) => p.status !== 'paid');
    const totalDebt = unpaidPeriods.reduce(
      (sum, p) => sum + Number(p.total) - Number(p.paidAmount),
      0,
    );

    // Per-company breakdown for current month
    const companyBreakdown = await Promise.all(
      companies.map(async (company) => {
        const [docsThisMonth, docsAuthorized] = await Promise.all([
          this.documentRepo.count({
            where: { companyId: company.id, createdAt: Between(monthStart, monthEnd) },
          }),
          this.documentRepo.count({
            where: {
              companyId: company.id,
              status: DocStatus.AUTHORIZED,
              createdAt: Between(monthStart, monthEnd),
            },
          }),
        ]);

        const plan = company.plan;
        const docLimit = plan?.docLimit ?? null;
        const basePrice = Number(plan?.monthlyPrice ?? 0);
        const overageDocs = docLimit && docsThisMonth > docLimit ? docsThisMonth - docLimit : 0;
        const overageUnitPrice = Number(plan?.overagePrice ?? 0);
        const overageTotal = overageDocs * overageUnitPrice;
        const subtotal = basePrice + overageTotal;

        return {
          companyId: company.id,
          name: company.tradeName || company.name,
          ruc: company.ruc,
          planName: plan?.name ?? null,
          docsThisMonth,
          docsAuthorized,
          docLimit,
          basePrice,
          overageDocs,
          overageTotal,
          subtotal,
        };
      }),
    );

    // Persist company breakdown detail if a billing period exists
    if (currentPeriod) {
      this.persistCompanyBreakdown(currentPeriod.id, companyBreakdown).catch(() => {});
    }

    return {
      accountBilling: {
        currentPeriod: currentPeriod ? this.formatPeriod(currentPeriod) : null,
        history: periods.map((p) => this.formatPeriod(p)),
        debt: {
          total: totalDebt,
          unpaidPeriods: unpaidPeriods.length,
        },
      },
      companyBreakdown,
      totals: {
        companies: companyBreakdown.length,
        docs: companyBreakdown.reduce((s, c) => s + c.docsThisMonth, 0),
        baseTotal: companyBreakdown.reduce((s, c) => s + c.basePrice, 0),
        overageTotal: companyBreakdown.reduce((s, c) => s + c.overageTotal, 0),
        grandTotal: companyBreakdown.reduce((s, c) => s + c.subtotal, 0),
      },
      warningMessage: account.warningMessage || null,
    };
  }

  private async persistCompanyBreakdown(
    billingPeriodId: number,
    breakdown: { companyId: number; docsThisMonth: number; docsAuthorized: number; basePrice: number; overageDocs: number; overageTotal: number; subtotal: number }[],
  ) {
    for (const row of breakdown) {
      await this.billingDetailRepo.query(
        `INSERT INTO app.billing_company_detail
           (bpe_id, com_id, bcd_docs_total, bcd_docs_authorized, bcd_base_price, bcd_overage_docs, bcd_overage_total, bcd_subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (bpe_id, com_id)
         DO UPDATE SET
           bcd_docs_total = $3,
           bcd_docs_authorized = $4,
           bcd_base_price = $5,
           bcd_overage_docs = $6,
           bcd_overage_total = $7,
           bcd_subtotal = $8,
           bcd_updated_at = NOW()`,
        [
          billingPeriodId, row.companyId,
          row.docsThisMonth, row.docsAuthorized, row.basePrice,
          row.overageDocs, row.overageTotal, row.subtotal,
        ],
      );
    }
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

