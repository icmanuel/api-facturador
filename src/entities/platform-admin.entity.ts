import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'app', name: 'platform_admin' })
export class PlatformAdmin {
  @PrimaryGeneratedColumn({ name: 'pad_id' })
  id: number;

  @Column({ name: 'pad_name', length: 150 })
  name: string;

  @Column({ name: 'pad_email', length: 254, unique: true })
  email: string;

  @Column({ name: 'pad_password_hash', length: 255, select: false })
  passwordHash: string;

  @Column({ name: 'pad_is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'pad_created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'pad_updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date;
}
