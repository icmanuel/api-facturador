import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentError } from '../../entities/document-error.entity';
import { Document } from '../../entities/document.entity';
import { ErrorAnalyticsController } from './error-analytics.controller';
import { ErrorAnalyticsService } from './error-analytics.service';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentError, Document])],
  controllers: [ErrorAnalyticsController],
  providers: [ErrorAnalyticsService],
})
export class ErrorAnalyticsModule {}
