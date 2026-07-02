// src/users/users.module.ts
// ─────────────────────────────────────────────────────────────────────────────
// UsersModule
// ─────────────────────────────────────────────────────────────────────────────
// Owns the User entity and its repository.
// Exports UsersRepository so AuthModule can use it without coupling to the DB layer.
// ─────────────────────────────────────────────────────────────────────────────

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './entities/user.entity';
import { UsersRepository } from './repositories/users.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersRepository],
  exports: [UsersRepository],
})
export class UsersModule {}
