import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingPeriod } from '../../entities/billing-period.entity';
import { Payment } from '../../entities/payment.entity';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [TypeOrmModule.forFeature([BillingPeriod, Payment])],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
