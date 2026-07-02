// src/users/repositories/users.repository.ts
// ─────────────────────────────────────────────────────────────────────────────
// UsersRepository
// ─────────────────────────────────────────────────────────────────────────────
// Data access layer for the User entity.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { AbstractRepository } from 'src/common/database/abstract.repository';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersRepository extends AbstractRepository<User> {
  protected readonly logger = new Logger(UsersRepository.name);

  constructor(
    @InjectRepository(User)
    entityRepository: Repository<User>,
    entityManager: EntityManager,
  ) {
    super(entityRepository, entityManager);
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.entityRepository.findOne({ where: { googleId } });
  }

  // entityManager.save() requires an entity class instance, not a plain object.
  // This method is the correct entry point for creating users from Google profile data.
  async createFromGoogleProfile(profile: {
    googleId: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  }): Promise<User> {
    const user = this.entityRepository.create(profile);
    return this.entityRepository.save(user);
  }
}
