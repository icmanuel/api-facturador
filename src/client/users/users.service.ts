import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AccountUser } from '../../entities/account-user.entity';
import { CreateClientUserDto } from './dto/create-client-user.dto';
import { UpdateClientUserDto } from './dto/update-client-user.dto';

@Injectable()
export class ClientUsersService {
  constructor(
    @InjectRepository(AccountUser)
    private readonly userRepo: Repository<AccountUser>,
  ) {}

  async findAll(accountId: number) {
    return this.userRepo.find({
      where: { accountId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(accountId: number, dto: CreateClientUserDto) {
    // Check for duplicate email
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.userRepo.create({
      accountId,
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role,
    });

    const saved = await this.userRepo.save(user);
    // Remove passwordHash from response
    const { passwordHash: _, ...result } = saved as any;
    return result;
  }

  async update(accountId: number, userId: number, dto: UpdateClientUserDto) {
    const user = await this.userRepo.findOne({
      where: { id: userId, accountId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepo.findOne({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Ya existe un usuario con ese email');
      }
    }

    if (dto.password) {
      (user as any).passwordHash = await bcrypt.hash(dto.password, 10);
    }

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    const saved = await this.userRepo.save(user);
    const { passwordHash: _, ...result } = saved as any;
    return result;
  }

  async remove(accountId: number, userId: number) {
    const user = await this.userRepo.findOne({
      where: { id: userId, accountId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    user.isActive = false;
    await this.userRepo.save(user);

    return { message: 'Usuario desactivado correctamente' };
  }
}
