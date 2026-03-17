import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemLog } from '../../entities/system-log.entity';
import { LogType, LogLevel } from '../../entities/enums';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(SystemLog)
    private readonly repo: Repository<SystemLog>,
  ) {}

  async findAll(
    page = 1,
    limit = 20,
    type?: LogType,
    level?: LogLevel,
    companyId?: number,
    search?: string,
  ): Promise<PaginatedResult<SystemLog>> {
    const qb = this.repo.createQueryBuilder('log');
    qb.leftJoinAndSelect('log.company', 'company');

    if (type) {
      qb.andWhere('log.type = :type', { type });
    }
    if (level) {
      qb.andWhere('log.level = :level', { level });
    }
    if (companyId) {
      qb.andWhere('log.companyId = :companyId', { companyId });
    }
    if (search) {
      qb.andWhere('log.message ILIKE :search', { search: `%${search}%` });
    }

    qb.orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getSummary() {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [total, byLevel, byType, last24h] = await Promise.all([
      this.repo.count(),
      this.repo.query(
        `SELECT slg_level as level, COUNT(*) as count FROM app.system_log GROUP BY slg_level`,
      ),
      this.repo.query(
        `SELECT slg_type as type, COUNT(*) as count FROM app.system_log GROUP BY slg_type`,
      ),
      this.repo.query(
        `SELECT slg_level as level, COUNT(*) as count
         FROM app.system_log
         WHERE slg_created_at >= $1
         GROUP BY slg_level`,
        [twentyFourHoursAgo],
      ),
    ]);

    return {
      total,
      byLevel: (byLevel || []).map((r: any) => ({ level: r.level, count: Number(r.count) })),
      byType: (byType || []).map((r: any) => ({ type: r.type, count: Number(r.count) })),
      last24h: (last24h || []).map((r: any) => ({ level: r.level, count: Number(r.count) })),
    };
  }
}
