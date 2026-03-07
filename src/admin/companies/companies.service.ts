import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomBytes } from 'crypto';

import { Company } from '../../entities/company.entity';
import { EmissionPoint } from '../../entities/emission-point.entity';
import { CompanyDocType } from '../../entities/company-doc-type.entity';
import { CompanySeries } from '../../entities/company-series.entity';
import { CompanyStatus, SriDocTypeCode } from '../../entities/enums';
import { S3StorageService } from '../../engine/storage/s3.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateEmissionPointDto } from './dto/create-emission-point.dto';
import { UpdateEmissionPointDto } from './dto/update-emission-point.dto';
import { SetSequentialDto } from './dto/set-sequential.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(EmissionPoint)
    private readonly emissionPointRepo: Repository<EmissionPoint>,
    @InjectRepository(CompanyDocType)
    private readonly companyDocTypeRepo: Repository<CompanyDocType>,
    @InjectRepository(CompanySeries)
    private readonly companySeriesRepo: Repository<CompanySeries>,
    private readonly dataSource: DataSource,
    private readonly s3Service: S3StorageService,
  ) {}

  async findAll(
    page: number,
    limit: number,
    search?: string,
    accountId?: number,
    status?: CompanyStatus,
  ) {
    const qb = this.companyRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.account', 'account')
      .leftJoinAndSelect('c.plan', 'plan')
      .leftJoinAndSelect('c.emissionPoints', 'emissionPoints')
      .leftJoinAndSelect('c.docTypes', 'docTypes');

    if (search) {
      qb.andWhere('(c.name ILIKE :search OR c.ruc ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (accountId) {
      qb.andWhere('c.accountId = :accountId', { accountId });
    }

    if (status) {
      qb.andWhere('c.status = :status', { status });
    }

    qb.orderBy('c.createdAt', 'DESC');

    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<Company> {
    const company = await this.companyRepo.findOne({
      where: { id },
      relations: ['account', 'plan', 'emissionPoints', 'docTypes', 'certificates'],
    });

    if (!company) {
      throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
    }

    return company;
  }

  async create(dto: CreateCompanyDto): Promise<Company> {
    const exists = await this.companyRepo.findOne({ where: { ruc: dto.ruc } });
    if (exists) {
      throw new ConflictException(`Ya existe una empresa con RUC ${dto.ruc}`);
    }

    const apiKey = 'sk_' + randomBytes(32).toString('hex');

    const company = this.companyRepo.create({
      ...dto,
      apiKey,
      billingStartDate: dto.billingStartDate ?? new Date().toISOString().slice(0, 10),
    });

    return this.companyRepo.save(company);
  }

  async update(id: number, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findOne(id);
    Object.assign(company, dto);
    return this.companyRepo.save(company);
  }

  async addEmissionPoint(
    companyId: number,
    dto: CreateEmissionPointDto,
  ): Promise<EmissionPoint> {
    await this.findOne(companyId);

    const emissionPoint = this.emissionPointRepo.create({
      ...dto,
      companyId,
    });

    return this.emissionPointRepo.save(emissionPoint);
  }

  async updateEmissionPoint(
    companyId: number,
    empId: number,
    dto: UpdateEmissionPointDto,
  ): Promise<EmissionPoint> {
    await this.findOne(companyId);

    const ep = await this.emissionPointRepo.findOne({
      where: { id: empId, companyId },
    });

    if (!ep) {
      throw new NotFoundException(
        `Punto de emisión ${empId} no encontrado en empresa ${companyId}`,
      );
    }

    Object.assign(ep, dto);
    return this.emissionPointRepo.save(ep);
  }

  async removeEmissionPoint(
    companyId: number,
    empId: number,
  ): Promise<void> {
    await this.findOne(companyId);

    const result = await this.emissionPointRepo.delete({
      id: empId,
      companyId,
    });

    if (result.affected === 0) {
      throw new NotFoundException(
        `Punto de emisión ${empId} no encontrado en empresa ${companyId}`,
      );
    }
  }

  async getSequentials(companyId: number): Promise<CompanySeries[]> {
    await this.findOne(companyId);
    return this.companySeriesRepo.find({
      where: { companyId },
      order: { docType: 'ASC', establishment: 'ASC', emissionPoint: 'ASC' },
    });
  }

  async setSequential(companyId: number, dto: SetSequentialDto): Promise<CompanySeries | null> {
    await this.findOne(companyId);

    // Upsert: create or update the series row
    await this.dataSource.query(
      `INSERT INTO app.company_series
         (com_id, cse_doc_type, cse_establishment, cse_emission_point, cse_next_sequential)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (com_id, cse_doc_type, cse_establishment, cse_emission_point)
       DO UPDATE SET cse_next_sequential = $5`,
      [companyId, dto.docType, dto.establishment, dto.emissionPoint, dto.nextSequential],
    );

    return this.companySeriesRepo.findOne({
      where: {
        companyId,
        docType: dto.docType,
        establishment: dto.establishment,
        emissionPoint: dto.emissionPoint,
      },
    });
  }

  async setDocTypes(
    companyId: number,
    codes: SriDocTypeCode[],
  ): Promise<CompanyDocType[]> {
    await this.findOne(companyId);

    return this.dataSource.transaction(async (manager) => {
      await manager.delete(CompanyDocType, { companyId });

      const docTypes = codes.map((code) =>
        manager.create(CompanyDocType, { companyId, code }),
      );

      return manager.save(CompanyDocType, docTypes);
    });
  }

  async uploadLogo(companyId: number, buffer: Buffer, mimeType: string) {
    const company = await this.findOne(companyId);

    // Delete old logo if exists
    if (company.logoS3Key) {
      await this.s3Service.deleteLogo(company.logoS3Key).catch(() => {});
    }

    const result = await this.s3Service.uploadLogo(company.ruc, buffer, mimeType);
    company.logoS3Key = result.s3Key;
    await this.companyRepo.save(company);

    return { logoS3Key: result.s3Key };
  }

  async deleteLogo(companyId: number): Promise<void> {
    const company = await this.findOne(companyId);
    if (company.logoS3Key) {
      await this.s3Service.deleteLogo(company.logoS3Key).catch(() => {});
      company.logoS3Key = null as any;
      await this.companyRepo.save(company);
    }
  }

  async getLogoUrl(companyId: number) {
    const company = await this.findOne(companyId);
    return { logoS3Key: company.logoS3Key || null };
  }

  async downloadLogo(s3Key: string): Promise<Buffer> {
    return this.s3Service.download(s3Key);
  }
}
