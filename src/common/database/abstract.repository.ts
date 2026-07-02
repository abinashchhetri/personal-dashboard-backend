// src/common/database/abstract.repository.ts
// ─────────────────────────────────────────────────────────────────────────────
// AbstractRepository
// ─────────────────────────────────────────────────────────────────────────────
// Generic CRUD base shared by every feature repository.
// Feature repos extend this and add their own custom query methods.
// ─────────────────────────────────────────────────────────────────────────────

import { Logger, NotFoundException } from '@nestjs/common';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { AbstractEntity } from './abstract.entity';

export abstract class AbstractRepository<T extends AbstractEntity<T>> {
  protected abstract readonly logger: Logger;

  constructor(
    public readonly entityRepository: Repository<T>,
    private readonly entityManager: EntityManager,
  ) {}

  async create(entity: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>) {
    return this.entityManager.save(entity);
  }

  async findOne(where: FindOptionsWhere<T>): Promise<T> {
    const entity = await this.entityRepository.findOne({ where });
    if (!entity) {
      this.logger.warn('Entity not found', where);
      throw new NotFoundException('Record not found');
    }
    return entity;
  }

  async findOneAndUpdate(
    where: FindOptionsWhere<T>,
    partial: QueryDeepPartialEntity<T>,
  ) {
    const result = await this.entityRepository.update(where, partial);
    if (!result.affected) {
      this.logger.warn('Update target not found', where);
      throw new NotFoundException('Record not found');
    }
    return result;
  }

  async find(where: FindOptionsWhere<T>): Promise<T[]> {
    return this.entityRepository.findBy(where);
  }

  async findOneAndDelete(where: FindOptionsWhere<T>) {
    return this.entityRepository.delete(where);
  }
}
