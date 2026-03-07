import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAdmin } from '../../entities/platform-admin.entity';
import { PlatformAdminsController } from './platform-admins.controller';
import { PlatformAdminsService } from './platform-admins.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformAdmin])],
  controllers: [PlatformAdminsController],
  providers: [PlatformAdminsService],
})
export class PlatformAdminsModule {}
