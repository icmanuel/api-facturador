import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Account } from '../../entities/account.entity';
import { AccountUser } from '../../entities/account-user.entity';
import { AccountUserRole } from '../../entities/enums';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateAccountUserDto } from './dto/create-account-user.dto';
import { UpdateAccountUserDto } from './dto/update-account-user.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly repo: Repository<Account>,
    @InjectRepository(AccountUser)
    private readonly userRepo: Repository<AccountUser>,
  ) {}

  async findAll(
    page: number,
    limit: number,
    search?: string,
  ): Promise<PaginatedResult<Account>> {
    const qb = this.repo
      .createQueryBuilder('account')
      .leftJoinAndSelect('account.companies', 'company')
      .leftJoinAndSelect('company.plan', 'plan');

    if (search) {
      qb.where(
        'account.name ILIKE :search OR account.ruc ILIKE :search',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('account.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<Account> {
    const account = await this.repo.findOne({
      where: { id },
      relations: ['users', 'companies', 'companies.plan', 'billingPeriods'],
    });
    if (!account) throw new NotFoundException('Cuenta no encontrada');
    return account;
  }

  async create(dto: CreateAccountDto): Promise<Account> {
    const { adminName, adminEmail, adminPassword, ...accountData } = dto;
    const account = this.repo.create(accountData);
    const saved = await this.repo.save(account);

    if (adminName && adminEmail && adminPassword) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const user = this.userRepo.create({
        accountId: saved.id,
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: AccountUserRole.ADMIN,
      });
      await this.userRepo.save(user);
    }

    return saved;
  }

  async update(id: number, dto: UpdateAccountDto): Promise<Account> {
    const account = await this.findOne(id);
    Object.assign(account, dto);
    return this.repo.save(account);
  }

  async findUsers(accountId: number): Promise<AccountUser[]> {
    await this.findOne(accountId);
    return this.userRepo.find({
      where: { accountId },
      order: { id: 'DESC' },
    });
  }

  async createUser(
    accountId: number,
    dto: CreateAccountUserDto,
  ): Promise<AccountUser> {
    await this.findOne(accountId);
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      accountId,
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role,
    });
    return this.userRepo.save(user);
  }

  async updateUser(
    accountId: number,
    userId: number,
    dto: UpdateAccountUserDto,
  ): Promise<AccountUser> {
    const user = await this.userRepo.findOne({
      where: { id: userId, accountId },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    return this.userRepo.save(user);
  }

  async removeUser(accountId: number, userId: number): Promise<AccountUser> {
    const user = await this.userRepo.findOne({
      where: { id: userId, accountId },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    user.isActive = false;
    return this.userRepo.save(user);
  }
}
