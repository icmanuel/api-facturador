import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../../entities/account.entity';
import { Company } from '../../entities/company.entity';
import { Document } from '../../entities/document.entity';
import { BillingPeriod } from '../../entities/billing-period.entity';
import { Certificate } from '../../entities/certificate.entity';
import { SystemLog } from '../../entities/system-log.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account, Company, Document, BillingPeriod, Certificate, SystemLog]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
