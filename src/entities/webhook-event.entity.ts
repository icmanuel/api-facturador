import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Document } from './document.entity';
import { Company } from './company.entity';

@Entity({ schema: 'app', name: 'webhook_event' })
export class WebhookEvent {
  @PrimaryGeneratedColumn({ name: 'whe_id' })
  id: number;

  @Column({ name: 'doc_id' })
  documentId: number;

  @Column({ name: 'com_id' })
  companyId: number;

  @Column({ name: 'whe_event_type', length: 50 })
  eventType: string;

  @Column({ name: 'whe_url', type: 'text' })
  url: string;

  @Column({ name: 'whe_status_code', type: 'smallint', nullable: true })
  statusCode: number;

  @Column({ name: 'whe_response_body', type: 'text', nullable: true })
  responseBody: string;

  @Column({ name: 'whe_attempt', type: 'smallint', default: 1 })
  attempt: number;

  @Column({ name: 'whe_success', default: false })
  success: boolean;

  @Column({ name: 'whe_sent_at', type: 'timestamptz', default: () => 'now()' })
  sentAt: Date;

  @Column({ name: 'whe_duration_ms', type: 'int', nullable: true })
  durationMs: number;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doc_id' })
  document: Document;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'com_id' })
  company: Company;
}
