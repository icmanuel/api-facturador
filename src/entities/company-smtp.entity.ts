import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from './company.entity';

@Entity({ schema: 'app', name: 'company_smtp' })
export class CompanySmtp {
  @PrimaryGeneratedColumn({ name: 'csm_id' })
  id: number;

  @Column({ name: 'com_id', unique: true })
  companyId: number;

  @Column({ name: 'csm_host', length: 255 })
  host: string;

  @Column({ name: 'csm_port', type: 'int', default: 587 })
  port: number;

  @Column({ name: 'csm_secure', length: 10, default: 'tls' })
  secure: string; // 'tls' | 'ssl' | 'none'

  @Column({ name: 'csm_user', length: 255 })
  user: string;

  @Column({ name: 'csm_password', type: 'text' })
  password: string; // encrypted base64

  @Column({ name: 'csm_password_iv', type: 'text' })
  passwordIv: string; // IV base64

  @Column({ name: 'csm_from_email', length: 254 })
  fromEmail: string;

  @Column({ name: 'csm_from_name', length: 100 })
  fromName: string;

  @Column({ name: 'csm_is_active', default: false })
  isActive: boolean;

  @Column({ name: 'csm_verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @CreateDateColumn({ name: 'csm_created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'csm_updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'com_id' })
  company: Company;
}
