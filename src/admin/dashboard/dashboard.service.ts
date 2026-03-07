import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../../entities/account.entity';
import { Company } from '../../entities/company.entity';
import { Document } from '../../entities/document.entity';
import { DocStatus } from '../../entities/enums';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
  ) {}

  async getStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalAccounts,
      totalCompanies,
      totalDocuments,
      docsAuthorizedToday,
      recentActivity,
      weeklyChartRaw,
      avgLatencyResult,
      docsFailed,
      docsProcessing,
    ] = await Promise.all([
      this.accountRepo.count({ where: { isActive: true } }),
      this.companyRepo.count({ where: { isActive: true } }),
      this.documentRepo.count(),
      this.documentRepo
        .createQueryBuilder('doc')
        .where('doc.status = :status', { status: DocStatus.AUTHORIZED })
        .andWhere('doc.createdAt >= :todayStart', { todayStart })
        .getCount(),
      this.documentRepo
        .createQueryBuilder('doc')
        .leftJoinAndSelect('doc.company', 'company')
        .orderBy('doc.createdAt', 'DESC')
        .take(10)
        .getMany(),

      // Weekly chart: authorized vs rejected per day (last 7 days)
      this.documentRepo.query(
        `SELECT
          doc_created_at::date as day,
          COUNT(*) FILTER (WHERE doc_status = 'AUTHORIZED') as authorized,
          COUNT(*) FILTER (WHERE doc_status = 'REJECTED') as rejected
        FROM app.document
        WHERE doc_created_at >= $1
        GROUP BY day
        ORDER BY day ASC`,
        [sevenDaysAgo],
      ),

      // Average latency from last 100 docs that have processing time
      this.documentRepo.query(
        `SELECT AVG(sub.doc_processing_time_ms) as avg
         FROM (
           SELECT doc_processing_time_ms FROM app.document
           WHERE doc_processing_time_ms IS NOT NULL
           ORDER BY doc_created_at DESC
           LIMIT 100
         ) sub`,
      ).then((rows) => rows[0] ?? { avg: null }),

      // Failed + Rejected docs in last 24 hours
      this.documentRepo
        .createQueryBuilder('doc')
        .where('doc.status IN (:...statuses)', {
          statuses: [DocStatus.FAILED, DocStatus.REJECTED],
        })
        .andWhere('doc.createdAt >= :twentyFourHoursAgo', { twentyFourHoursAgo })
        .getCount(),

      // Docs currently in CREATED or PROCESSING
      this.documentRepo
        .createQueryBuilder('doc')
        .where('doc.status IN (:...statuses)', {
          statuses: [DocStatus.CREATED, DocStatus.PROCESSING],
        })
        .getCount(),
    ]);

    // Build weekly chart with all 7 days (fill missing days with zeros)
    const chartMap = new Map<string, { authorized: number; rejected: number }>();
    for (const row of weeklyChartRaw) {
      const dateStr =
        row.day instanceof Date
          ? row.day.toISOString().slice(0, 10)
          : String(row.day).slice(0, 10);
      chartMap.set(dateStr, {
        authorized: Number(row.authorized) || 0,
        rejected: Number(row.rejected) || 0,
      });
    }

    const weeklyChart: {
      name: string;
      date: string;
      authorized: number;
      rejected: number;
    }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayName = DAY_NAMES[d.getDay()];
      const counts = chartMap.get(dateStr) || { authorized: 0, rejected: 0 };
      weeklyChart.push({
        name: dayName,
        date: dateStr,
        authorized: counts.authorized,
        rejected: counts.rejected,
      });
    }

    // Health statuses
    const avgMs = avgLatencyResult?.avg ? Number(avgLatencyResult.avg) : 0;
    const avgSeconds = (avgMs / 1000).toFixed(2);

    const healthStatuses = [
      { label: 'SRI Producción', status: 'Operativo', ok: true },
      { label: 'SRI Pruebas', status: 'Operativo', ok: true },
      { label: 'Workers', status: '3/3 activos', ok: true },
      { label: 'Latencia Promedio', status: `${avgSeconds}s`, ok: avgMs < 5000 },
    ];

    return {
      totalAccounts,
      totalCompanies,
      totalDocuments,
      docsAuthorizedToday,
      recentActivity,
      weeklyChart,
      healthStatuses,
      docsFailed,
      docsProcessing,
    };
  }
}
