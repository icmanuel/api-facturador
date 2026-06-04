import { Module } from '@nestjs/common';
import { EngineModule } from '../../engine/engine.module';
import { SystemController } from './system.controller';

@Module({
  imports: [EngineModule],
  controllers: [SystemController],
})
export class SystemModule {}
