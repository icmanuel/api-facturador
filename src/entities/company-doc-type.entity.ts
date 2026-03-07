import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SriDocTypeCode } from './enums';
import { Company } from './company.entity';

@Entity({ schema: 'app', name: 'company_doc_type' })
export class CompanyDocType {
  @PrimaryGeneratedColumn({ name: 'cdt_id' })
  id: number;

  @Column({ name: 'com_id' })
  companyId: number;

  @Column({ name: 'cdt_code', type: 'enum', enum: SriDocTypeCode, enumName: 'sri_doc_type_code' })
  code: SriDocTypeCode;

  @ManyToOne(() => Company, (c) => c.docTypes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'com_id' })
  company: Company;
}
