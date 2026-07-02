// src/categories/categories.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// CategoriesService
// ─────────────────────────────────────────────────────────────────────────────
// Business logic for the categories domain.
// System categories (isSystem: true) are read-only — mutations throw ForbiddenException.
// detectCategory is the public entry point used by the voice/transaction parser.
// ─────────────────────────────────────────────────────────────────────────────

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Category } from './entities/category.entity';
import { CategoriesRepository } from './repositories/categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async create(dto: CreateCategoryDto, userId: string): Promise<Category> {
    return this.categoriesRepository.createCategory({
      userId,
      name: dto.name,
      icon: dto.icon ?? null,
      color: dto.color ?? null,
      keywords: dto.keywords ?? [],
      isCustom: true,
      isSystem: false,
    });
  }

  async findAll(userId: string): Promise<Category[]> {
    return this.categoriesRepository.findAllForUser(userId);
  }

  async findOne(id: string): Promise<Category> {
    return this.categoriesRepository.findOne({ id } as any);
  }

  async update(
    id: string,
    dto: UpdateCategoryDto,
    userId: string,
  ): Promise<Category> {
    const category = await this.categoriesRepository.findOne({ id } as any);
    this.assertMutable(category, userId);

    await this.categoriesRepository.findOneAndUpdate({ id } as any, dto as any);
    return this.categoriesRepository.findOne({ id } as any);
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const category = await this.categoriesRepository.findOne({ id } as any);
    this.assertMutable(category, userId);

    await this.categoriesRepository.findOneAndDelete({ id } as any);
    return { message: 'Category deleted successfully' };
  }

  // Used by the transactions module and voice parser to auto-assign a category.
  async detectCategory(
    itemName: string,
    userId: string,
  ): Promise<Category | null> {
    return this.categoriesRepository.findByKeywordMatch(itemName, userId);
  }

  // System categories cannot be edited or deleted by any user.
  // Custom categories are owned — another user cannot mutate them.
  private assertMutable(category: Category, userId: string): void {
    if (category.isSystem) {
      throw new ForbiddenException('System categories cannot be modified or deleted');
    }
    if (category.userId !== userId) {
      throw new ForbiddenException('You do not own this category');
    }
  }
}
