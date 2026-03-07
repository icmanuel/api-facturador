import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LogType, LogLevel } from './enums';
import { Company } from './company.entity';

@Entity({ schema: 'app', name: 'system_log' })
export class SystemLog {
  @PrimaryGeneratedColumn({ name: 'slg_id' })
  id: number;

  @Column({ name: 'com_id', nullable: true })
  companyId: number;

  @Column({ name: 'slg_type', type: 'enum', enum: LogType, enumName: 'log_type' })
  type: LogType;

  @Column({ name: 'slg_level', type: 'enum', enum: LogLevel, enumName: 'log_level' })
  level: LogLevel;

  @Column({ name: 'slg_message', type: 'text' })
  message: string;

  @Column({ name: 'slg_metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'slg_created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Company, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'com_id' })
  company: Company;
}
