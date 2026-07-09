// src/app.module.ts
// ─────────────────────────────────────────────────────────────────────────────
// AppModule
// ─────────────────────────────────────────────────────────────────────────────
// Root module — imports global config, database, throttler, and all feature modules.
// ─────────────────────────────────────────────────────────────────────────────

import * as fs from 'fs';
import * as path from 'path';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountsModule } from './accounts/accounts.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { DatabaseModule } from './common/database/database.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { InvestmentsModule } from './investments/investments.module';
import { TransfersModule } from './transfers/transfers.module';
import { UsersModule } from './users/users.module';
import { MusicModule } from './music/music.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { MealsModule } from './meals/meals.module';
import { WorkoutModule } from './workout/workout.module';

// Resolve the project-root .env regardless of process.cwd() or which build
// output this runs from. The exact __dirname depth varies (e.g. compiled
// output nests as dist/src/app.module.js, not dist/app.module.js, since
// migrations/ and typeorm.config.ts at the project root push tsc's inferred
// rootDir up a level) — so walk up from __dirname until a .env is found
// instead of assuming a fixed number of ".." segments.
function resolveEnvFilePath(): string {
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, '.env');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.join(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return path.join(__dirname, '..', '.env');
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolveEnvFilePath(),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    DatabaseModule,
    UsersModule,
    AuthModule,
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    TransfersModule,
    InvestmentsModule,
    AnalyticsModule,
    MusicModule,
    PlaylistsModule,
    MealsModule,
    WorkoutModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
