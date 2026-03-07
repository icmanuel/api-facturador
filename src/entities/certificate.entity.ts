import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from './company.entity';

@Entity({ schema: 'app', name: 'certificate' })
export class Certificate {
  @PrimaryGeneratedColumn({ name: 'cer_id' })
  id: number;

  @Column({ name: 'com_id' })
  companyId: number;

  @Column({ name: 'cer_file_name', type: 'varchar', length: 300 })
  fileName: string;

  @Column({ name: 'cer_s3_key', type: 'varchar', length: 500, nullable: true })
  s3Key: string | null;

  @Column({ name: 'cer_password_enc', type: 'text', select: false })
  passwordEnc: string;

  @Column({ name: 'cer_expires_at', type: 'date' })
  expiresAt: Date;

  @Column({ name: 'cer_is_current', default: true })
  isCurrent: boolean;

  @Column({ name: 'cer_uploaded_at', type: 'timestamptz', default: () => 'now()' })
  uploadedAt: Date;

  @Column({ name: 'cer_uploaded_by', type: 'int', nullable: true })
  uploadedBy: number | null;

  @Column({ name: 'cer_p12_encrypted', type: 'bytea', nullable: true, select: false })
  p12Encrypted: Buffer | null;

  @Column({ name: 'cer_p12_iv', type: 'bytea', nullable: true, select: false })
  p12Iv: Buffer | null;

  @Column({ name: 'cer_subject_cn', type: 'varchar', length: 300, nullable: true })
  subjectCn: string | null;

  @ManyToOne(() => Company, (c) => c.certificates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'com_id' })
  company: Company;
}
