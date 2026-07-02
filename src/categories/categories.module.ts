// src/categories/categories.module.ts
// ─────────────────────────────────────────────────────────────────────────────
// CategoriesModule
// ─────────────────────────────────────────────────────────────────────────────
// Owns all category domain logic including keyword-based auto-categorization.
// Exports CategoriesService so the future TransactionsModule can call detectCategory.
// ─────────────────────────────────────────────────────────────────────────────

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Category } from './entities/category.entity';
import { CategoriesController } from './categories.controller';
import { CategoriesRepository } from './repositories/categories.repository';
import { CategoriesService } from './categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoriesRepository],
  exports: [CategoriesService],
})
export class CategoriesModule {}
