import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, Queue } from 'bullmq';
import { DocumentProcessingService } from '../engine/processing/document-processing.service';
import { Document } from '../entities/document.entity';
import { DocStatus } from '../entities/enums';
import { DOCUMENT_QUEUE } from './queues.constants';

export interface ProcessDocumentJob {
  documentId: number;
  /** When true, only retry the authorization check (skip XML/sign/send) */
  authCheckOnly?: boolean;
}

/** Max number of auth-check retries before giving up */
const MAX_AUTH_CHECK_RETRIES = 10;
/** Delays for auth-check retries (in ms): 30s, 30s, 60s, 60s, 120s, 120s, 300s... */
const AUTH_CHECK_DELAYS = [30_000, 30_000, 60_000, 60_000, 120_000, 120_000, 300_000, 300_000, 300_000, 300_000];

@Processor(DOCUMENT_QUEUE, { concurrency: 5 })
export class DocumentProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(DocumentProcessor.name);

  constructor(
    private readonly processingService: DocumentProcessingService,
    @InjectQueue(DOCUMENT_QUEUE) private readonly queue: Queue,
    @InjectRepository(Document) private readonly docRepo: Repository<Document>,
    private readonly config: ConfigService,
  ) {
    super();
  }

  onModuleInit() {
    const concurrency = Number(this.config.get('BULLMQ_CONCURRENCY', 5)) || 5;
    this.worker.concurrency = concurrency;
    this.logger.log(`Worker concurrency set to ${concurrency}`);
  }

  async process(job: Job<ProcessDocumentJob>): Promise<void> {
    const { documentId, authCheckOnly } = job.data;

    if (authCheckOnly) {
      return this.processAuthCheck(job);
    }

    this.logger.log(`Processing document ${documentId} (attempt ${job.attemptsMade + 1})`);

    const result = await this.processingService.processDocument(documentId);

    if (result.status === 'failed') {
      // Re-throw so BullMQ retries the full pipeline
      throw new Error(result.errors[0]?.message || 'Processing failed');
    }

    if (result.status === 'processing') {
      // SRI accepted but hasn't authorized yet — schedule delayed auth check
      await this.scheduleAuthCheck(documentId, 0);
      return;
    }

    this.logger.log(`Document ${documentId} finished: ${result.status} in ${result.processingTimeMs}ms`);
  }

  /**
   * Process an auth-check-only job (for documents already sent to SRI).
   */
  private async processAuthCheck(job: Job<ProcessDocumentJob>): Promise<void> {
    const { documentId } = job.data;
    const attempt = job.attemptsMade;

    this.logger.log(`Auth check for document ${documentId} (attempt ${attempt + 1}/${MAX_AUTH_CHECK_RETRIES})`);

    const result = await this.processingService.retryAuthorization(documentId);

    if (result.status === 'processing' && attempt < MAX_AUTH_CHECK_RETRIES - 1) {
      await this.scheduleAuthCheck(documentId, attempt + 1);
      return;
    }

    if (result.status === 'processing') {
      this.logger.warn(`Document ${documentId}: SRI still processing after ${MAX_AUTH_CHECK_RETRIES} auth checks — marking FAILED`);
      await this.docRepo.update(documentId, { status: DocStatus.FAILED });
      return;
    }

    this.logger.log(`Auth check for document ${documentId}: ${result.status}`);
  }

  private async scheduleAuthCheck(documentId: number, attempt: number): Promise<void> {
    const delay = AUTH_CHECK_DELAYS[attempt] ?? 300_000;
    this.logger.log(`Scheduling auth check for document ${documentId} in ${delay / 1000}s (attempt ${attempt + 1})`);

    await this.queue.add('auth-check', {
      documentId,
      authCheckOnly: true,
    }, {
      jobId: `auth-check-${documentId}-${attempt}`,
      delay,
      attempts: 1, // Don't let BullMQ auto-retry auth checks — we manage retries ourselves
    });
  }
}
