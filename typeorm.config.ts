// typeorm.config.ts
// ─────────────────────────────────────────────────────────────────────────────
// TypeORM CLI DataSource
// ─────────────────────────────────────────────────────────────────────────────
// Used exclusively by the TypeORM CLI for migration commands.
// synchronize is always false — schema changes go through migrations only.
// tsconfig-paths/register MUST be first — CLI runs outside NestJS and won't
// resolve src/* path aliases without it.
// ─────────────────────────────────────────────────────────────────────────────

import 'tsconfig-paths/register';

import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  host: configService.get<string>('DB_HOST'),
  port: configService.get<number>('DB_PORT'),
  username: configService.get<string>('DB_USERNAME'),
  password: configService.get<string>('DB_PASSWORD'),
  database: configService.get<string>('DB_NAME'),
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['migrations/*{.ts,.js}'],
  synchronize: false,
});
