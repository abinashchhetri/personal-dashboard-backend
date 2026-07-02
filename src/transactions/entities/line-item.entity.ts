import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';
import { Category } from 'src/categories/entities/category.entity';
import { Transaction } from './transaction.entity';

const decimalToNumber = {
  to: (v: number): number => v,
  from: (v: string | number): number => Number(v),
};

@Entity('line_items')
export class LineItem extends AbstractEntity<LineItem> {
  @Index()
  @Column({ type: 'uuid' })
  transactionId!: string;

  // onDelete CASCADE ensures line items are purged when the parent transaction is deleted.
  @ManyToOne(() => Transaction, (t) => t.lineItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transactionId' })
  transaction!: Transaction;

  @Column({ type: 'uuid', nullable: true })
  categoryId!: string | null;

  @ManyToOne(() => Category, { eager: false, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category!: Category | null;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: decimalToNumber })
  amount!: number;
}
