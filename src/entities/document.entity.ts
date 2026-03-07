import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { SriDocTypeCode, DocStatus, CompanyEnv } from './enums';
import { Company } from './company.entity';
import { DocumentTimeline } from './document-timeline.entity';
import { DocumentError } from './document-error.entity';
import { DocumentFile } from './document-file.entity';

@Entity({ schema: 'app', name: 'document' })
export class Document {
  @PrimaryGeneratedColumn({ name: 'doc_id', type: 'bigint' })
  id: number;

  @Column({ name: 'com_id' })
  companyId: number;

  @Column({ name: 'doc_type_code', type: 'enum', enum: SriDocTypeCode, enumName: 'sri_doc_type_code' })
  typeCode: SriDocTypeCode;

  @Column({ name: 'doc_sequential', length: 20 })
  sequential: string;

  @Column({ name: 'doc_access_key', length: 49, unique: true })
  accessKey: string;

  @Column({ name: 'doc_status', type: 'enum', enum: DocStatus, enumName: 'doc_status', default: DocStatus.CREATED })
  status: DocStatus;

  @Column({ name: 'doc_env', type: 'enum', enum: CompanyEnv, enumName: 'company_env' })
  env: CompanyEnv;

  @Column({ name: 'doc_issue_date', type: 'date' })
  issueDate: Date;

  @Column({ name: 'doc_auth_number', length: 49, nullable: true })
  authNumber: string;

  @Column({ name: 'doc_auth_at', type: 'timestamptz', nullable: true })
  authAt: Date;

  @Column({ name: 'doc_received_at', type: 'timestamptz', default: () => 'now()' })
  receivedAt: Date;

  @Column({ name: 'doc_total_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ name: 'doc_subtotal', type: 'numeric', precision: 14, scale: 2, default: 0 })
  subtotal: number;

  @Column({ name: 'doc_total_tax', type: 'numeric', precision: 14, scale: 2, default: 0 })
  totalTax: number;

  @Column({ name: 'doc_total_discount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  totalDiscount: number;

  @Column({ name: 'doc_buyer_name', length: 300, nullable: true })
  buyerName: string;

  @Column({ name: 'doc_buyer_id_type', length: 2, nullable: true })
  buyerIdType: string;

  @Column({ name: 'doc_buyer_id', length: 20, nullable: true })
  buyerId: string;

  @Column({ name: 'doc_establishment', length: 3 })
  establishment: string;

  @Column({ name: 'doc_emission_point', length: 3 })
  emissionPoint: string;

  @Column({ name: 'doc_retries', type: 'smallint', default: 0 })
  retries: number;

  @Column({ name: 'doc_processing_time_ms', type: 'int', nullable: true })
  processingTimeMs: number;

  @Column({ name: 'doc_idempotency_key', length: 100, nullable: true })
  idempotencyKey: string;

  @Column({ name: 'doc_content_hash', length: 64, nullable: true })
  contentHash: string;

  @Column({ name: 'doc_payload', type: 'jsonb', nullable: true })
  payload: Record<string, any>;

  @Column({ name: 'doc_ride_regenerations', type: 'smallint', default: 0 })
  rideRegenerations: number;

  @Column({ name: 'doc_billable', default: false })
  billable: boolean;

  @CreateDateColumn({ name: 'doc_created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'doc_updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date;

  @ManyToOne(() => Company, (c) => c.documents, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'com_id' })
  company: Company;

  @OneToMany(() => DocumentTimeline, (t) => t.document)
  timeline: DocumentTimeline[];

  @OneToMany(() => DocumentError, (e) => e.document)
  errors: DocumentError[];

  @OneToMany(() => DocumentFile, (f) => f.document)
  files: DocumentFile[];
}
