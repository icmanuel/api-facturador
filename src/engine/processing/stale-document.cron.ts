import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Document } from '../../entities/document.entity';
import { DocStatus } from '../../entities/enums';
import { SriService } from '../sri/sri.service';
import { EventsGateway } from '../../events/events.gateway';
import { RedisLockService } from '../../common/services/redis-lock.service';

/**
 * Cron job that cleans up documents stuck in non-terminal states.
 *
 * Terminal states: AUTHORIZED, REJECTED, FAILED
 * Non-terminal states that can get stuck: PROCESSING, RECEIVED, CREATED
 *
 * Runs every 5 minutes.
 */
@Injectable()
export class StaleDocumentCron {
  private readonly logger = new Logger(StaleDocumentCron.name);

  /** Documents stuck in PROCESSING for longer than this are considered crashed */
  private readonly PROCESSING_TIMEOUT_MIN = 10;
  /** Documents stuck in RECEIVED for longer than this get a final auth check */
  private readonly RECEIVED_TIMEOUT_MIN = 30;
  /** Documents stuck in CREATED for longer than this are marked FAILED */
  private readonly CREATED_TIMEOUT_MIN = 60;

  constructor(
    @InjectRepository(Document)
    private readonly docRepo: Repository<Document>,
    private readonly sriService: SriService,
    private readonly eventsGateway: EventsGateway,
    private readonly redisLock: RedisLockService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleStaleDocuments(): Promise<void> {
    // Distributed lock: only one instance runs the cron
    const acquired = await this.redisLock.acquire('stale-documents-cron', 240);
    if (!acquired) {
      this.logger.debug('Stale documents cron skipped — another instance holds the lock');
      return;
    }

    try {
      await Promise.all([
        this.recoverStuckProcessing(),
        this.resolveStuckReceived(),
        this.cleanupStuckCreated(),
      ]);
    } finally {
      await this.redisLock.release('stale-documents-cron');
    }
  }

  /**
   * Documents stuck in PROCESSING: the process crashed or timed out.
   * Reset to FAILED so they can be retried by the worker or manually.
   */
  private async recoverStuckProcessing(): Promise<void> {
    const cutoff = new Date(Date.now() - this.PROCESSING_TIMEOUT_MIN * 60_000);

    const stuck = await this.docRepo.find({
      where: {
        status: DocStatus.PROCESSING,
        updatedAt: LessThan(cutoff),
      },
      relations: ['company'],
    });

    if (stuck.length === 0) return;

    this.logger.warn(`Found ${stuck.length} documents stuck in PROCESSING (>${this.PROCESSING_TIMEOUT_MIN}min)`);

    for (const doc of stuck) {
      const stuckMinutes = Math.round((Date.now() - doc.updatedAt.getTime()) / 60_000);
      this.logger.warn(`Document ${doc.id}: stuck in PROCESSING for ${stuckMinutes}min — marking FAILED`);
      await this.docRepo.update(doc.id, {
        status: DocStatus.FAILED,
        retries: doc.retries + 1,
      });
      this.emitStatus(doc, 'FAILED');
    }
  }

  /**
   * Documents stuck in RECEIVED: SRI accepted but never authorized.
   * Try one final auth check. If authorized → update. Otherwise → FAILED.
   */
  private async resolveStuckReceived(): Promise<void> {
    const cutoff = new Date(Date.now() - this.RECEIVED_TIMEOUT_MIN * 60_000);

    const stuck = await this.docRepo.find({
      where: {
        status: DocStatus.RECEIVED,
        updatedAt: LessThan(cutoff),
      },
      relations: ['company'],
    });

    if (stuck.length === 0) return;

    this.logger.warn(`Found ${stuck.length} documents stuck in RECEIVED (>${this.RECEIVED_TIMEOUT_MIN}min)`);

    for (const doc of stuck) {
      const stuckMinutes = Math.round((Date.now() - doc.updatedAt.getTime()) / 60_000);
      this.logger.log(`Document ${doc.id}: stuck in RECEIVED for ${stuckMinutes}min — final auth check`);

      try {
        const authResult = await this.sriService.checkAuthorization(doc.accessKey, doc.env);
        this.logger.log(`Document ${doc.id}: final auth check → state=${authResult.state}, authorized=${authResult.authorized}`);

        if (authResult.authorized) {
          await this.docRepo.update(doc.id, {
            status: DocStatus.AUTHORIZED,
            authNumber: authResult.authorizationNumber ?? undefined,
            authAt: authResult.authorizedAt ? new Date(authResult.authorizedAt) : new Date(),
            billable: true,
          });
          this.logger.log(`Document ${doc.id}: recovered — AUTHORIZED by cron`);
          this.emitStatus(doc, 'AUTHORIZED');
        } else if (authResult.state === 'NO AUTORIZADO') {
          await this.docRepo.update(doc.id, {
            status: DocStatus.REJECTED,
            retries: doc.retries + 1,
          });
          this.logger.warn(`Document ${doc.id}: NO AUTORIZADO — marked REJECTED by cron`);
          this.emitStatus(doc, 'REJECTED');
        } else {
          // Still unknown/processing after 30+ min — give up
          await this.docRepo.update(doc.id, {
            status: DocStatus.FAILED,
            retries: doc.retries + 1,
          });
          this.logger.warn(`Document ${doc.id}: still ${authResult.state} after ${stuckMinutes}min — marked FAILED by cron`);
          this.emitStatus(doc, 'FAILED');
        }
      } catch (err: any) {
        this.logger.error(`Document ${doc.id}: final auth check failed: ${err.message}`);
        // Don't mark FAILED on network error — will retry next cron run
      }
    }
  }

  /**
   * Documents stuck in CREATED: never even started processing.
   * This shouldn't happen normally, but can if the queue job was lost.
   */
  private async cleanupStuckCreated(): Promise<void> {
    const cutoff = new Date(Date.now() - this.CREATED_TIMEOUT_MIN * 60_000);

    const stuck = await this.docRepo.find({
      where: {
        status: DocStatus.CREATED,
        updatedAt: LessThan(cutoff),
      },
      relations: ['company'],
    });

    if (stuck.length === 0) return;

    this.logger.warn(`Found ${stuck.length} documents stuck in CREATED (>${this.CREATED_TIMEOUT_MIN}min)`);

    for (const doc of stuck) {
      this.logger.warn(`Document ${doc.id}: stuck in CREATED — marking FAILED`);
      await this.docRepo.update(doc.id, {
        status: DocStatus.FAILED,
        retries: doc.retries + 1,
      });
      this.emitStatus(doc, 'FAILED');
    }
  }

  private emitStatus(doc: Document, status: string) {
    try {
      this.eventsGateway.emitDocumentUpdate({
        documentId: doc.id,
        status,
        companyId: doc.companyId,
        accountId: doc.company?.accountId,
        accessKey: doc.accessKey,
        typeCode: doc.typeCode,
        sequential: doc.sequential,
      });
    } catch { /* non-critical */ }
  }
}
