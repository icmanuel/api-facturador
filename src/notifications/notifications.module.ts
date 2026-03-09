import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certificate } from '../entities/certificate.entity';
import { BillingPeriod } from '../entities/billing-period.entity';
import { Company } from '../entities/company.entity';
import { NotificationService } from './notification.service';
import { NotificationCron } from './notification.cron';
import { RedisLockService } from '../common/services/redis-lock.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Certificate, BillingPeriod, Company]),
  ],
  providers: [NotificationService, NotificationCron, RedisLockService],
  exports: [NotificationService],
})
export class NotificationsModule {}
