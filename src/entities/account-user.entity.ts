import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AccountUserRole } from './enums';
import { Account } from './account.entity';

@Entity({ schema: 'app', name: 'account_user' })
export class AccountUser {
  @PrimaryGeneratedColumn({ name: 'aus_id' })
  id: number;

  @Column({ name: 'acc_id' })
  accountId: number;

  @Column({ name: 'aus_name', length: 150 })
  name: string;

  @Column({ name: 'aus_email', length: 254, unique: true })
  email: string;

  @Column({ name: 'aus_password_hash', length: 255, select: false })
  passwordHash: string;

  @Column({ name: 'aus_role', type: 'enum', enum: AccountUserRole, enumName: 'account_user_role', default: AccountUserRole.VIEWER })
  role: AccountUserRole;

  @Column({ name: 'aus_is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'aus_created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'aus_updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date;

  @ManyToOne(() => Account, (a) => a.users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'acc_id' })
  account: Account;
}
