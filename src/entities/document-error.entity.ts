import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SriErrorCategory, SriErrorSeverity } from './enums';
import { Document } from './document.entity';

@Entity({ schema: 'app', name: 'document_error' })
export class DocumentError {
  @PrimaryGeneratedColumn({ name: 'der_id' })
  id: number;

  @Column({ name: 'doc_id' })
  documentId: number;

  @Column({ name: 'der_code', length: 10 })
  code: string;

  @Column({ name: 'der_message', length: 500 })
  message: string;

  @Column({ name: 'der_detail', type: 'text', nullable: true })
  detail: string;

  @Column({ name: 'der_category', type: 'enum', enum: SriErrorCategory, enumName: 'sri_error_category' })
  category: SriErrorCategory;

  @Column({ name: 'der_severity', type: 'enum', enum: SriErrorSeverity, enumName: 'sri_error_severity' })
  severity: SriErrorSeverity;

  @Column({ name: 'der_billable', default: false })
  billable: boolean;

  @Column({ name: 'der_field', length: 100, nullable: true })
  field: string;

  @CreateDateColumn({ name: 'der_created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Document, (d) => d.errors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doc_id' })
  document: Document;
}
