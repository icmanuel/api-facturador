import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NotificationPriority } from './enums';
import { PlatformAdmin } from './platform-admin.entity';

@Entity({ schema: 'app', name: 'notification' })
export class Notification {
  @PrimaryGeneratedColumn({ name: 'ntf_id' })
  id: number;

  @Column({ name: 'pad_id', nullable: true })
  adminId: number;

  @Column({ name: 'ntf_type', length: 50 })
  type: string;

  @Column({ name: 'ntf_title', length: 200 })
  title: string;

  @Column({ name: 'ntf_message', type: 'text' })
  message: string;

  @Column({ name: 'ntf_priority', type: 'enum', enum: NotificationPriority, enumName: 'notification_priority', default: NotificationPriority.INFO })
  priority: NotificationPriority;

  @Column({ name: 'ntf_ref_type', length: 50, nullable: true })
  refType: string;

  @Column({ name: 'ntf_ref_id', type: 'int', nullable: true })
  refId: number;

  @Column({ name: 'ntf_read', default: false })
  read: boolean;

  @Column({ name: 'ntf_dismissed', default: false })
  dismissed: boolean;

  @CreateDateColumn({ name: 'ntf_created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => PlatformAdmin, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pad_id' })
  admin: PlatformAdmin;
}
