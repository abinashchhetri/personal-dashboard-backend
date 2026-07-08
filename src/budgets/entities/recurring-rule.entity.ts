import { Column, Entity, Index } from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';

const decimalToNumber = {
  to: (v: number): number => v,
  from: (v: string | number): number => Number(v),
};

// 'monthly' | 'weekly' | 'yearly'
export type RecurringCadence = 'monthly' | 'weekly' | 'yearly';

// 'active' | 'dismissed'
export type RecurringStatus = 'active' | 'dismissed';

@Entity('recurring_rules')
export class RecurringRule extends AbstractEntity<RecurringRule> {
  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar' })
  merchant!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: decimalToNumber })
  amount!: number;

  @Column({ type: 'varchar' })
  cadence!: RecurringCadence;

  // Next expected charge date; null until first seen or after dismissal.
  @Column({ type: 'date', nullable: true })
  nextDueDate!: string | null;

  @Column({ type: 'varchar', default: 'active' })
  status!: RecurringStatus;

  // The last transaction matched to this rule — used to avoid re-triggering.
  @Column({ type: 'uuid', nullable: true })
  lastSeenTransactionId!: string | null;

  // When to surface the reminder to the user; null = not yet scheduled.
  @Column({ type: 'timestamptz', nullable: true })
  reminderAt!: Date | null;
}
