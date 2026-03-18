import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, In, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Company } from '../../entities/company.entity';
import { Account } from '../../entities/account.entity';
import { SubscriptionPlan } from '../../entities/subscription-plan.entity';
import { PlanTier, AccountType } from '../../entities/enums';
import { EmissionPoint } from '../../entities/emission-point.entity';
import { CompanySeries } from '../../entities/company-series.entity';
import { CompanyDocType } from '../../entities/company-doc-type.entity';
import { S3StorageService } from '../../engine/storage/s3.service';
import { CertificatesService } from '../../admin/certificates/certificates.service';
import { CreateClientCompanyDto } from './dto/create-client-company.dto';
import { UpdateClientCompanyDto } from './dto/update-client-company.dto';
import { CreateEmissionPointDto } from '../../admin/companies/dto/create-emission-point.dto';
import { UpdateEmissionPointDto } from '../../admin/companies/dto/update-emission-point.dto';
import { SetSequentialDto } from '../../admin/companies/dto/set-sequential.dto';
import { SriDocTypeCode } from '../../entities/enums';

@Injectable()
export class ClientCompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(EmissionPoint)
    private readonly emissionPointRepo: Repository<EmissionPoint>,
    @InjectRepository(CompanySeries)
    private readonly companySeriesRepo: Repository<CompanySeries>,
    @InjectRepository(CompanyDocType)
    private readonly companyDocTypeRepo: Repository<CompanyDocType>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    private readonly dataSource: DataSource,
    private readonly s3Service: S3StorageService,
    private readonly certificatesService: CertificatesService,
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

  async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    return this.planRepo.find({
      where: {
        isActive: true,
        tier: Not(In([PlanTier.UNLIMITED, PlanTier.CUSTOM])),
      },
      order: { monthlyPrice: 'ASC' },
    });
  }

  async create(accountId: number, dto: CreateClientCompanyDto): Promise<Company> {
    // Only multi-company accounts can create companies
    const account = await this.accountRepo.findOne({ where: { id: accountId } });
    if (!account) {
      throw new NotFoundException('Cuenta no encontrada');
    }
    if (account.type !== AccountType.MULTI) {
      throw new ForbiddenException(
        'Las cuentas de empresa única no pueden crear empresas adicionales. Contacte soporte para actualizar a multi-empresa.',
      );
    }

    // Validate plan exists and is not restricted
    const plan = await this.planRepo.findOne({ where: { id: dto.planId } });
    if (!plan) {
      throw new BadRequestException('Plan no encontrado');
    }
    const restrictedTiers: PlanTier[] = [PlanTier.UNLIMITED, PlanTier.CUSTOM];
    if (restrictedTiers.includes(plan.tier)) {
      throw new BadRequestException(
        `El plan "${plan.name}" (${plan.tier}) solo puede ser asignado por un administrador`,
      );
    }
    if (!plan.isActive) {
      throw new BadRequestException('El plan seleccionado no está disponible');
    }

    const exists = await this.companyRepo.findOne({ where: { ruc: dto.ruc } });
    if (exists) {
      throw new ConflictException(`Ya existe una empresa con RUC ${dto.ruc}`);
    }

    const apiKey = 'sk_' + randomBytes(32).toString('hex');

    const company = this.companyRepo.create({
      ...dto,
      accountId,
      apiKey,
      billingStartDate: dto.billingStartDate ?? new Date().toISOString().slice(0, 10),
    });

    return this.companyRepo.save(company);
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

  // ── Doc Types ──

  async setDocTypes(
    accountId: number,
    companyId: number,
    codes: SriDocTypeCode[],
  ): Promise<CompanyDocType[]> {
    const company = await this.findOne(accountId, companyId);

    return this.dataSource.transaction(async (manager) => {
      await manager.delete(CompanyDocType, { companyId: company.id });

      const docTypes = codes.map((code) =>
        manager.create(CompanyDocType, { companyId: company.id, code }),
      );

      return manager.save(CompanyDocType, docTypes);
    });
  }

  // ── Certificates ──

  async uploadCertificate(
    accountId: number,
    companyId: number,
    fileBuffer: Buffer,
    fileName: string,
    password: string,
    uploadedBy: number | null,
  ) {
    const company = await this.findOne(accountId, companyId);
    return this.certificatesService.upload(company.id, fileBuffer, fileName, password, uploadedBy);
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
