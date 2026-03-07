import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../../entities/account.entity';
import { Company } from '../../entities/company.entity';
import { ClientProfileController } from './profile.controller';
import { ClientProfileService } from './profile.service';

@Module({
  imports: [TypeOrmModule.forFeature([Account, Company])],
  controllers: [ClientProfileController],
  providers: [ClientProfileService],
})
export class ClientProfileModule {}
