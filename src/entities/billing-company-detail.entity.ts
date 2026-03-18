import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BillingPeriod } from './billing-period.entity';
import { Company } from './company.entity';

@Entity({ schema: 'app', name: 'billing_company_detail' })
@Unique(['billingPeriodId', 'companyId'])
export class BillingCompanyDetail {
  @PrimaryGeneratedColumn({ name: 'bcd_id' })
  id: number;

  @Column({ name: 'bpe_id' })
  billingPeriodId: number;

  @Column({ name: 'com_id' })
  companyId: number;

  @Column({ name: 'bcd_docs_total', type: 'int', default: 0 })
  docsTotal: number;

  @Column({ name: 'bcd_docs_authorized', type: 'int', default: 0 })
  docsAuthorized: number;

  @Column({ name: 'bcd_base_price', type: 'numeric', precision: 10, scale: 2, default: 0 })
  basePrice: number;

  @Column({ name: 'bcd_overage_docs', type: 'int', default: 0 })
  overageDocs: number;

  @Column({ name: 'bcd_overage_total', type: 'numeric', precision: 10, scale: 2, default: 0 })
  overageTotal: number;

  @Column({ name: 'bcd_subtotal', type: 'numeric', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @CreateDateColumn({ name: 'bcd_created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'bcd_updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date;

  @ManyToOne(() => BillingPeriod, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bpe_id' })
  billingPeriod: BillingPeriod;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'com_id' })
  company: Company;
}
