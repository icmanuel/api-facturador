import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Company } from '../../entities/company.entity';
import { EmissionPoint } from '../../entities/emission-point.entity';
import { CompanySeries } from '../../entities/company-series.entity';
import { S3StorageService } from '../../engine/storage/s3.service';
import { UpdateClientCompanyDto } from './dto/update-client-company.dto';
import { CreateEmissionPointDto } from '../../admin/companies/dto/create-emission-point.dto';
import { UpdateEmissionPointDto } from '../../admin/companies/dto/update-emission-point.dto';
import { SetSequentialDto } from '../../admin/companies/dto/set-sequential.dto';

@Injectable()
export class ClientCompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(EmissionPoint)
    private readonly emissionPointRepo: Repository<EmissionPoint>,
    @InjectRepository(CompanySeries)
    private readonly companySeriesRepo: Repository<CompanySeries>,
    private readonly dataSource: DataSource,
    private readonly s3Service: S3StorageService,
  ) {}

  async findAll(accountId: number) {
    return this.companyRepo.find({
      where: { accountId },
      relations: ['plan', 'emissionPoints', 'docTypes', 'certificates'],
    });
  }

  async findOne(accountId: number, companyId: number) {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
      relations: ['plan', 'emissionPoints', 'docTypes', 'certificates'],
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    if (company.accountId !== accountId) {
      throw new ForbiddenException('No tiene acceso a esta empresa');
    }

    return company;
  }

  async update(
    accountId: number,
    companyId: number,
    dto: UpdateClientCompanyDto,
  ) {
    const company = await this.findOne(accountId, companyId);
    Object.assign(company, dto);
    return this.companyRepo.save(company);
  }

  async uploadLogo(accountId: number, companyId: number, buffer: Buffer, mimeType: string) {
    const company = await this.findOne(accountId, companyId);

    if (company.logoS3Key) {
      await this.s3Service.deleteLogo(company.logoS3Key).catch(() => {});
    }

    const result = await this.s3Service.uploadLogo(company.ruc, buffer, mimeType);
    company.logoS3Key = result.s3Key;
    await this.companyRepo.save(company);

    return { logoS3Key: result.s3Key };
  }

  async deleteLogo(accountId: number, companyId: number): Promise<void> {
    const company = await this.findOne(accountId, companyId);
    if (company.logoS3Key) {
      await this.s3Service.deleteLogo(company.logoS3Key).catch(() => {});
      company.logoS3Key = null as any;
      await this.companyRepo.save(company);
    }
  }

  async getLogoUrl(accountId: number, companyId: number) {
    const company = await this.findOne(accountId, companyId);
    return { logoS3Key: company.logoS3Key || null };
  }

  async downloadLogo(s3Key: string): Promise<Buffer> {
    return this.s3Service.download(s3Key);
  }

  // ── Emission Points ──

  async addEmissionPoint(
    accountId: number,
    companyId: number,
    dto: CreateEmissionPointDto,
  ): Promise<EmissionPoint> {
    const company = await this.findOne(accountId, companyId);

    const exists = await this.emissionPointRepo.findOne({
      where: { companyId: company.id, code: dto.code },
    });
    if (exists) {
      throw new ConflictException(`Ya existe un punto de emisión con código ${dto.code}`);
    }

    const ep = this.emissionPointRepo.create({ ...dto, companyId: company.id });
    return this.emissionPointRepo.save(ep);
  }

  async updateEmissionPoint(
    accountId: number,
    companyId: number,
    empId: number,
    dto: UpdateEmissionPointDto,
  ): Promise<EmissionPoint> {
    const company = await this.findOne(accountId, companyId);

    const ep = await this.emissionPointRepo.findOne({
      where: { id: empId, companyId: company.id },
    });

    if (!ep) {
      throw new NotFoundException(`Punto de emisión ${empId} no encontrado`);
    }

    Object.assign(ep, dto);
    return this.emissionPointRepo.save(ep);
  }

  async removeEmissionPoint(
    accountId: number,
    companyId: number,
    empId: number,
  ): Promise<void> {
    const company = await this.findOne(accountId, companyId);

    const result = await this.emissionPointRepo.delete({
      id: empId,
      companyId: company.id,
    });

    if (result.affected === 0) {
      throw new NotFoundException(`Punto de emisión ${empId} no encontrado`);
    }
  }

  // ── Sequentials ──

  async getSequentials(accountId: number, companyId: number): Promise<CompanySeries[]> {
    const company = await this.findOne(accountId, companyId);
    return this.companySeriesRepo.find({
      where: { companyId: company.id },
      order: { docType: 'ASC', establishment: 'ASC', emissionPoint: 'ASC' },
    });
  }

  async setSequential(
    accountId: number,
    companyId: number,
    dto: SetSequentialDto,
  ): Promise<CompanySeries | null> {
    const company = await this.findOne(accountId, companyId);

    await this.dataSource.query(
      `INSERT INTO app.company_series
         (com_id, cse_doc_type, cse_establishment, cse_emission_point, cse_next_sequential)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (com_id, cse_doc_type, cse_establishment, cse_emission_point)
       DO UPDATE SET cse_next_sequential = $5`,
      [company.id, dto.docType, dto.establishment, dto.emissionPoint, dto.nextSequential],
    );

    return this.companySeriesRepo.findOne({
      where: {
        companyId: company.id,
        docType: dto.docType,
        establishment: dto.establishment,
        emissionPoint: dto.emissionPoint,
      },
    });
  }
}
