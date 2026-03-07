import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { PlatformAdmin } from '../../entities/platform-admin.entity';
import { CreatePlatformAdminDto } from './dto/create-platform-admin.dto';
import { UpdatePlatformAdminDto } from './dto/update-platform-admin.dto';

@Injectable()
export class PlatformAdminsService {
  constructor(
    @InjectRepository(PlatformAdmin)
    private readonly repo: Repository<PlatformAdmin>,
  ) {}

  async findAll() {
    return this.repo.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  async create(dto: CreatePlatformAdminDto) {
    const exists = await this.repo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email ya registrado');

    const hash = await bcrypt.hash(dto.password, 10);
    const admin = this.repo.create({
      name: dto.name,
      email: dto.email,
      passwordHash: hash,
    });
    const saved = await this.repo.save(admin);
    // Don't return passwordHash
    const { passwordHash, ...result } = saved as any;
    return result;
  }

  async update(id: number, dto: UpdatePlatformAdminDto) {
    const admin = await this.repo.findOne({ where: { id } });
    if (!admin) throw new NotFoundException('Admin no encontrado');

    if (dto.name) admin.name = dto.name;
    if (dto.email) {
      const dup = await this.repo.findOne({ where: { email: dto.email } });
      if (dup && dup.id !== id) throw new ConflictException('Email ya registrado');
      admin.email = dto.email;
    }
    if (dto.password) {
      admin.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const saved = await this.repo.save(admin);
    const { passwordHash, ...result } = saved as any;
    return result;
  }

  async remove(id: number) {
    const admin = await this.repo.findOne({ where: { id } });
    if (!admin) throw new NotFoundException('Admin no encontrado');

    // Check there's at least one active admin remaining
    const count = await this.repo.count({ where: { isActive: true } });
    if (count <= 1) throw new ConflictException('No se puede eliminar el último administrador');

    admin.isActive = false;
    await this.repo.save(admin);
  }
}
