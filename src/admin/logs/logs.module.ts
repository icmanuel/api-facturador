import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemLog } from '../../entities/system-log.entity';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';

@Module({
  imports: [TypeOrmModule.forFeature([SystemLog])],
  controllers: [LogsController],
  providers: [LogsService],
})
export class LogsModule {}
