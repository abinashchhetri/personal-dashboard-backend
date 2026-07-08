// src/common/database/database.module.ts
// ─────────────────────────────────────────────────────────────────────────────
// DatabaseModule
// ─────────────────────────────────────────────────────────────────────────────
// Provides the TypeORM async connection using ConfigService.
// Imported once in AppModule — not re-imported by feature modules.
// ─────────────────────────────────────────────────────────────────────────────

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        migrations: ['dist/migrations/*{.js,.ts}'],
        // Auto-run pending migrations on startup in production; dev uses synchronize instead.
        migrationsRun: configService.get<string>('NODE_ENV') === 'production',
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
