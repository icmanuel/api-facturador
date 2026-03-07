import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../../entities/account.entity';
import { Company } from '../../entities/company.entity';
import { Document } from '../../entities/document.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Account, Company, Document])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
