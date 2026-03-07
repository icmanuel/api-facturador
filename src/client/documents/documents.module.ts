import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../../entities/document.entity';
import { DocumentFile } from '../../entities/document-file.entity';
import { Company } from '../../entities/company.entity';
import { EngineModule } from '../../engine/engine.module';
import { ClientDocumentsController } from './documents.controller';
import { ClientDocumentsService } from './documents.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, DocumentFile, Company]),
    EngineModule,
  ],
  controllers: [ClientDocumentsController],
  providers: [ClientDocumentsService],
})
export class ClientDocumentsModule {}
