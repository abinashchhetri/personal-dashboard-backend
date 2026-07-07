import { Column, Entity, Index } from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';

const decimalToNumber = {
  to: (v: number): number => v,
  from: (v: string | number): number => Number(v),
};

@Entity('budgets')
export class Budget extends AbstractEntity<Budget> {
  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid', nullable: true })
  categoryId!: string | null;

  // 'month' only for now; 'week'/'year' reserved for future cadences.
  @Column({ type: 'varchar', default: 'month' })
  period!: string;

  // First day of the budget month, stored as a date (e.g. 2026-07-01).
  // TypeORM returns date columns as strings; keep as string to avoid TZ drift.
  @Column({ type: 'date' })
  month!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: decimalToNumber })
  limitAmount!: number;

  // When true, unspent budget rolls over to the next month's limit.
  @Column({ default: false })
  rollover!: boolean;
}
