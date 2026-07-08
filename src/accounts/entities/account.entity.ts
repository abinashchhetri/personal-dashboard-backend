// src/accounts/entities/account.entity.ts
// ─────────────────────────────────────────────────────────────────────────────
// Account Entity
// ─────────────────────────────────────────────────────────────────────────────
// Represents a wallet/account owned by a user (cash, bank, eSewa, Khalti).
// currentBalance is mutated atomically by the transactions service — never
// written directly from account update endpoints.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';
import { User } from 'src/users/entities/user.entity';
import { AccountTypeEnum } from '../enums/account-type.enum';

// Postgres returns DECIMAL columns as strings; this converts them to numbers.
const decimalToNumber = {
  to: (v: number): number => v,
  from: (v: string | number): number => Number(v),
};

@Entity('accounts')
export class Account extends AbstractEntity<Account> {
  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'enum', enum: AccountTypeEnum })
  type!: AccountTypeEnum;

  @Column()
  name!: string;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
    transformer: decimalToNumber,
  })
  currentBalance!: number;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
    transformer: decimalToNumber,
  })
  initialBalance!: number;

  @Column({ default: false })
  isDefault!: boolean;

  @Column({ default: false })
  isArchived!: boolean;

  @Column({ type: 'jsonb', default: [] })
  voiceKeywords!: string[];

  @Column({ type: 'varchar', length: 3, default: 'NPR' })
  currency!: string;
}
