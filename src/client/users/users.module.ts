import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountUser } from '../../entities/account-user.entity';
import { ClientUsersController } from './users.controller';
import { ClientUsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([AccountUser])],
  controllers: [ClientUsersController],
  providers: [ClientUsersService],
})
export class ClientUsersModule {}
