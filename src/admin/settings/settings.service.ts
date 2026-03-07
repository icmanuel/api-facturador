import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PlatformSetting } from '../../entities/platform-setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(PlatformSetting)
    private readonly repo: Repository<PlatformSetting>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(): Promise<PlatformSetting[]> {
    return this.repo.find({ order: { key: 'ASC' } });
  }

  async updateBatch(
    entries: { key: string; value: string }[],
    adminId: number,
  ): Promise<PlatformSetting[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const updated: PlatformSetting[] = [];

      for (const entry of entries) {
        const setting = await queryRunner.manager.findOne(PlatformSetting, {
          where: { key: entry.key },
        });
        if (!setting) {
          throw new NotFoundException(
            `Configuración con clave "${entry.key}" no encontrada`,
          );
        }
        setting.value = entry.value;
        setting.updatedBy = adminId;
        setting.updatedAt = new Date();
        updated.push(await queryRunner.manager.save(setting));
      }

      await queryRunner.commitTransaction();
      return updated;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
