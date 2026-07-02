// src/categories/seeds/categories.seed.ts
// ─────────────────────────────────────────────────────────────────────────────
// seedSystemCategories
// ─────────────────────────────────────────────────────────────────────────────
// Inserts system-wide categories on first boot. Idempotent — checks (name, userId IS NULL)
// before inserting so re-running on restart is safe.
// ─────────────────────────────────────────────────────────────────────────────

import { Logger } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';

import { Category } from '../entities/category.entity';

const logger = new Logger('CategoriesSeed');

const SYSTEM_CATEGORIES: Array<{
  name: string;
  icon: string | null;
  color: string | null;
  keywords: string[];
}> = [
  {
    name: 'Food & Groceries',
    icon: null,
    color: null,
    keywords: [
      'dal', 'rice', 'meat', 'masu', 'sabji', 'vegetable',
      'milk', 'water', 'egg', 'oil', 'flour',
    ],
  },
  {
    name: 'Dining Out',
    icon: null,
    color: null,
    keywords: [
      'restaurant', 'cafe', 'lunch', 'dinner', 'breakfast',
      'khaja', 'momo', 'chowmein',
    ],
  },
  {
    name: 'Transport',
    icon: null,
    color: null,
    keywords: ['bus', 'taxi', 'fuel', 'petrol', 'fare', 'uber', 'pathao'],
  },
  {
    name: 'Utilities',
    icon: null,
    color: null,
    keywords: ['electricity', 'internet', 'water bill', 'phone bill'],
  },
  {
    name: 'Health',
    icon: null,
    color: null,
    keywords: ['medicine', 'doctor', 'pharmacy', 'hospital', 'clinic'],
  },
  {
    name: 'Entertainment',
    icon: null,
    color: null,
    keywords: ['movie', 'netflix', 'spotify', 'game'],
  },
  {
    name: 'Shopping',
    icon: null,
    color: null,
    keywords: ['clothes', 'shoes', 'bag', 'cosmetics'],
  },
  {
    name: 'Miscellaneous',
    icon: null,
    color: null,
    keywords: [], // catch-all fallback — must be last in the list
  },
];

export async function seedSystemCategories(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(Category);

  for (const seed of SYSTEM_CATEGORIES) {
    const exists = await repo.findOne({
      where: { name: seed.name, userId: IsNull() },
    });
    if (exists) continue;

    const entity = repo.create({
      ...seed,
      userId: null,
      isCustom: false,
      isSystem: true,
    });
    await repo.save(entity);
    logger.log(`Seeded system category: ${seed.name}`);
  }
}
