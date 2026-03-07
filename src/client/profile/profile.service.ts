import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../../entities/account.entity';
import { Company } from '../../entities/company.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ClientProfileService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async getProfile(accountId: number) {
    const account = await this.accountRepo.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Cuenta no encontrada');
    }

    const companies = await this.companyRepo.find({
      where: { accountId },
      relations: ['plan', 'emissionPoints', 'docTypes', 'certificates'],
    });

    return { ...account, companies };
  }

  async updateProfile(accountId: number, dto: UpdateProfileDto) {
    const account = await this.accountRepo.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Cuenta no encontrada');
    }

    Object.assign(account, dto);
    return this.accountRepo.save(account);
  }
}
