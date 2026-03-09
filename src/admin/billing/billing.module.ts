import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingPeriod } from '../../entities/billing-period.entity';
import { Payment } from '../../entities/payment.entity';
import { Account } from '../../entities/account.entity';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { NotificationsModule } from '../../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BillingPeriod, Payment, Account]),
    NotificationsModule,
  ],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
