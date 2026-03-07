import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PlatformAdmin } from './platform-admin.entity';

@Entity({ schema: 'app', name: 'platform_setting' })
export class PlatformSetting {
  @PrimaryGeneratedColumn({ name: 'pse_id' })
  id: number;

  @Column({ name: 'pse_key', length: 100, unique: true })
  key: string;

  @Column({ name: 'pse_value', type: 'text' })
  value: string;

  @Column({ name: 'pse_updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;

  @Column({ name: 'pse_updated_by', type: 'int', nullable: true })
  updatedBy: number;

  @ManyToOne(() => PlatformAdmin, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pse_updated_by' })
  admin: PlatformAdmin;
}
