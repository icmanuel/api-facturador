import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../../entities/company.entity';
import { EmissionPoint } from '../../entities/emission-point.entity';
import { CompanySeries } from '../../entities/company-series.entity';
import { EngineModule } from '../../engine/engine.module';
import { ClientCompaniesController } from './companies.controller';
import { ClientCompaniesService } from './companies.service';

@Module({
  imports: [TypeOrmModule.forFeature([Company, EmissionPoint, CompanySeries]), EngineModule],
  controllers: [ClientCompaniesController],
  providers: [ClientCompaniesService],
})
export class ClientCompaniesModule {}
