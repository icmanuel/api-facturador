import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { PlanTier } from './enums';
import { Company } from './company.entity';

@Entity({ schema: 'app', name: 'subscription_plan' })
export class SubscriptionPlan {
  @PrimaryGeneratedColumn({ name: 'spl_id' })
  id: number;

  @Column({ name: 'spl_tier', type: 'enum', enum: PlanTier, enumName: 'plan_tier' })
  tier: PlanTier;

  @Column({ name: 'spl_name', length: 100 })
  name: string;

  @Column({ name: 'spl_description', type: 'text', nullable: true })
  description: string;

  @Column({ name: 'spl_monthly_price', type: 'numeric', precision: 10, scale: 2 })
  monthlyPrice: number;

  @Column({ name: 'spl_doc_limit', type: 'int', nullable: true })
  docLimit: number | null;

  @Column({ name: 'spl_overage_price', type: 'numeric', precision: 8, scale: 4, nullable: true })
  overagePrice: number | null;

  @Column({ name: 'spl_features', type: 'text', array: true, default: '{}' })
  features: string[];

  @Column({ name: 'spl_highlighted', default: false })
  highlighted: boolean;

  @Column({ name: 'spl_is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'spl_created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => Company, (c) => c.plan)
  companies: Company[];
}
