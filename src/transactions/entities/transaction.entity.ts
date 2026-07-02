import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';
import { Account } from 'src/accounts/entities/account.entity';
import { Category } from 'src/categories/entities/category.entity';
import { TransactionTypeEnum } from '../enums/transaction-type.enum';
import { LineItem } from './line-item.entity';

const decimalToNumber = {
  to: (v: number): number => v,
  from: (v: string | number): number => Number(v),
};

@Entity('transactions')
export class Transaction extends AbstractEntity<Transaction> {
  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Index()
  @Column({ type: 'uuid' })
  accountId!: string;

  @ManyToOne(() => Account, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accountId' })
  account!: Account;

  @Column({ type: 'uuid', nullable: true })
  categoryId!: string | null;

  @ManyToOne(() => Category, { eager: false, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category!: Category | null;

  @Column({ type: 'enum', enum: TransactionTypeEnum })
  type!: TransactionTypeEnum;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: decimalToNumber })
  totalAmount!: number;

  @Column({ default: true })
  isPersonal!: boolean;

  @Column({ type: 'text', nullable: true })
  voiceTranscript!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'varchar', default: 'form' })
  entryMethod!: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  transactedAt!: Date;

  // cascade:true so qr.manager.save(Transaction, entity) also persists line items
  // in the same QueryRunner transaction.
  @OneToMany(() => LineItem, (item) => item.transaction, { cascade: true })
  lineItems!: LineItem[];
}
