import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TimelineStepStatus } from './enums';
import { Document } from './document.entity';

@Entity({ schema: 'app', name: 'document_timeline' })
export class DocumentTimeline {
  @PrimaryGeneratedColumn({ name: 'dtl_id' })
  id: number;

  @Column({ name: 'doc_id' })
  documentId: number;

  @Column({ name: 'dtl_step', length: 50 })
  step: string;

  @Column({ name: 'dtl_status', type: 'enum', enum: TimelineStepStatus, enumName: 'timeline_step_status' })
  status: TimelineStepStatus;

  @Column({ name: 'dtl_timestamp', type: 'timestamptz', nullable: true })
  timestamp: Date;

  @Column({ name: 'dtl_description', type: 'text', nullable: true })
  description: string;

  @Column({ name: 'dtl_duration_ms', type: 'int', nullable: true })
  durationMs: number;

  @Column({ name: 'dtl_detail', type: 'text', nullable: true })
  detail: string;

  @Column({ name: 'dtl_order', type: 'smallint' })
  order: number;

  @ManyToOne(() => Document, (d) => d.timeline, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doc_id' })
  document: Document;
}
