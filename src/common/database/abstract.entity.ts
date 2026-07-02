// src/common/database/abstract.entity.ts
// ─────────────────────────────────────────────────────────────────────────────
// AbstractEntity
// ─────────────────────────────────────────────────────────────────────────────
// Base entity shared by every feature entity.
// id is a Postgres-generated UUID (gen_random_uuid(), pgcrypto extension).
// createdAt/updatedAt use timestamptz so values are stored with timezone info.
// ─────────────────────────────────────────────────────────────────────────────

import { BeforeUpdate, Column, PrimaryGeneratedColumn } from 'typeorm';

export class AbstractEntity<T> {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }

  constructor(entity: Partial<T>) {
    Object.assign(this, entity);
  }
}
