import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SriDocTypeCode } from './enums';
import { Company } from './company.entity';

@Entity({ schema: 'app', name: 'company_series' })
export class CompanySeries {
  @PrimaryGeneratedColumn({ name: 'cse_id' })
  id: number;

  @Column({ name: 'com_id' })
  companyId: number;

  @Column({ name: 'cse_doc_type', type: 'enum', enum: SriDocTypeCode, enumName: 'sri_doc_type_code' })
  docType: SriDocTypeCode;

  @Column({ name: 'cse_establishment', length: 3 })
  establishment: string;

  @Column({ name: 'cse_emission_point', length: 3 })
  emissionPoint: string;

  @Column({ name: 'cse_next_sequential', type: 'int', default: 1 })
  nextSequential: number;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'com_id' })
  company: Company;
}
