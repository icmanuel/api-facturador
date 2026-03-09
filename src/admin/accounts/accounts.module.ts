import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../../entities/account.entity';
import { AccountUser } from '../../entities/account-user.entity';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { NotificationsModule } from '../../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Account, AccountUser]), NotificationsModule],
  controllers: [AccountsController],
  providers: [AccountsService],
})
export class AccountsModule {}
