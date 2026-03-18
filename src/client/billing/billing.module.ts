import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingPeriod } from '../../entities/billing-period.entity';
import { BillingCompanyDetail } from '../../entities/billing-company-detail.entity';
import { Payment } from '../../entities/payment.entity';
import { Company } from '../../entities/company.entity';
import { Document } from '../../entities/document.entity';
import { Account } from '../../entities/account.entity';
import { ClientBillingController } from './billing.controller';
import { ClientBillingService } from './billing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BillingPeriod, BillingCompanyDetail, Payment, Company, Document, Account]),
  ],
  controllers: [ClientBillingController],
  providers: [ClientBillingService],
})
export class ClientBillingModule {}
