// src/categories/repositories/categories.repository.ts
// ─────────────────────────────────────────────────────────────────────────────
// CategoriesRepository
// ─────────────────────────────────────────────────────────────────────────────
// Data access layer for the Category entity.
// findByKeywordMatch uses a JSONB lateral scan — it unnests the keywords array
// and checks whether the item name contains any keyword (ILIKE, case-insensitive).
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';

import { AbstractRepository } from 'src/common/database/abstract.repository';
import { Category } from '../entities/category.entity';

@Injectable()
export class CategoriesRepository extends AbstractRepository<Category> {
  protected readonly logger = new Logger(CategoriesRepository.name);

  constructor(
    @InjectRepository(Category)
    entityRepository: Repository<Category>,
    entityManager: EntityManager,
  ) {
    super(entityRepository, entityManager);
  }

  async createCategory(data: {
    userId: string | null;
    name: string;
    icon?: string | null;
    color?: string | null;
    keywords: string[];
    isCustom: boolean;
    isSystem: boolean;
  }): Promise<Category> {
    const category = this.entityRepository.create(data as Partial<Category>);
    return this.entityRepository.save(category);
  }

  // Returns system categories (userId IS NULL) union the user's custom ones.
  async findAllForUser(userId: string): Promise<Category[]> {
    return this.entityRepository
      .createQueryBuilder('category')
      .where('category.userId IS NULL OR category.userId = :userId', { userId })
      .orderBy('category.isSystem', 'DESC')
      .addOrderBy('category.name', 'ASC')
      .getMany();
  }

  // Unnests the keywords JSONB array and checks whether itemName contains any
  // keyword (ILIKE). Returns the Miscellaneous system category if nothing matches.
  async findByKeywordMatch(
    itemName: string,
    userId: string,
  ): Promise<Category | null> {
    const matched = await this.entityRepository
      .createQueryBuilder('category')
      .where(
        `EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(category.keywords) AS kw
          WHERE :itemName ILIKE '%' || kw || '%'
        )`,
        { itemName },
      )
      .andWhere('(category.userId IS NULL OR category.userId = :userId)', {
        userId,
      })
      .orderBy('category.isSystem', 'DESC')
      .getOne();

    if (matched) return matched;

    // Fallback: return the Miscellaneous system category (empty keywords, catch-all).
    return this.entityRepository.findOne({
      where: { name: 'Miscellaneous', userId: IsNull() },
    });
  }
}
