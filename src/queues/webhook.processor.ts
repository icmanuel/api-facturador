import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WebhookDeliveryService, DocumentWebhookEvent } from './webhook-delivery.service';
import { WEBHOOK_QUEUE } from './queues.constants';

interface WebhookJob {
  documentId: number;
  companyId: number;
  eventType: DocumentWebhookEvent;
}

@Processor(WEBHOOK_QUEUE, { concurrency: 5 })
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(private readonly delivery: WebhookDeliveryService) {
    super();
  }

  async process(job: Job<WebhookJob>): Promise<void> {
    const attempt = job.attemptsMade + 1;
    try {
      await this.delivery.deliver(job.data, attempt);
      this.logger.log(
        `Webhook delivered: doc=${job.data.documentId} event=${job.data.eventType} attempt=${attempt}`,
      );
    } catch (err: any) {
      this.logger.warn(
        `Webhook attempt ${attempt} failed for doc=${job.data.documentId} event=${job.data.eventType}: ${err.message}`,
      );
      throw err; // let BullMQ retry with backoff
    }
  }
}
