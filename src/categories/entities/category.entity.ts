// src/categories/entities/category.entity.ts
// ─────────────────────────────────────────────────────────────────────────────
// Category Entity
// ─────────────────────────────────────────────────────────────────────────────
// Represents a transaction category. userId NULL = system-wide shared category.
// keywords (jsonb) drives the auto-categorization logic in the voice parser.
// ─────────────────────────────────────────────────────────────────────────────

import { Column, Entity, Index } from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';

@Entity('categories')
export class Category extends AbstractEntity<Category> {
  // NULL for system categories shared across all users.
  @Index()
  @Column({ type: 'uuid', nullable: true, default: null })
  userId!: string | null;

  @Column()
  name!: string;

  @Column({ nullable: true, type: 'varchar' })
  icon!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  color!: string | null;

  // Array of lowercase keywords; matched against transaction item names during parsing.
  @Column({ type: 'jsonb', default: [] })
  keywords!: string[];

  @Column({ default: false })
  isCustom!: boolean;

  // System categories are seeded on startup and cannot be mutated by users.
  @Column({ default: false })
  isSystem!: boolean;
}
