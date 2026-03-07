import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DocFileType } from './enums';
import { Document } from './document.entity';

@Entity({ schema: 'app', name: 'document_file' })
export class DocumentFile {
  @PrimaryGeneratedColumn({ name: 'dfi_id' })
  id: number;

  @Column({ name: 'doc_id' })
  documentId: number;

  @Column({ name: 'dfi_type', type: 'enum', enum: DocFileType, enumName: 'doc_file_type' })
  type: DocFileType;

  @Column({ name: 'dfi_s3_key', length: 500 })
  s3Key: string;

  @Column({ name: 'dfi_size_bytes', type: 'int', nullable: true })
  sizeBytes: number;

  @Column({ name: 'dfi_hash_sha256', length: 64, nullable: true })
  hashSha256: string;

  @Column({ name: 'dfi_mime_type', length: 100 })
  mimeType: string;

  @CreateDateColumn({ name: 'dfi_created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Document, (d) => d.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doc_id' })
  document: Document;
}
