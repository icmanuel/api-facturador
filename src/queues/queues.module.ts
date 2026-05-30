import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EngineModule } from '../engine/engine.module';
import { DocumentProcessor } from './document.processor';
import { WebhookProcessor } from './webhook.processor';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { Document } from '../entities/document.entity';
import { Company } from '../entities/company.entity';
import { WebhookEvent } from '../entities/webhook-event.entity';
import { DOCUMENT_QUEUE, WEBHOOK_QUEUE } from './queues.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, Company, WebhookEvent]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: DOCUMENT_QUEUE,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 500,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    }),
    BullModule.registerQueue({
      name: WEBHOOK_QUEUE,
      defaultJobOptions: {
        removeOnComplete: 500,
        removeOnFail: 1000,
      },
    }),
    EngineModule,
  ],
  providers: [DocumentProcessor, WebhookProcessor, WebhookDeliveryService],
  exports: [BullModule, WebhookDeliveryService],
})
export class QueuesModule {}
