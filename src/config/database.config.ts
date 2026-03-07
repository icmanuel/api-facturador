import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const databaseConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: config.get('DB_HOST'),
  port: config.get<number>('DB_PORT'),
  username: config.get('DB_USERNAME'),
  password: config.get('DB_PASSWORD'),
  database: config.get('DB_NAME'),
  schema: config.get('DB_SCHEMA'),
  entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
  synchronize: false,
  extra: {
    max: config.get<number>('DB_POOL_MAX', 20),
  },
});
