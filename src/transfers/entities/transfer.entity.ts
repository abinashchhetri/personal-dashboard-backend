import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';
import { Account } from 'src/accounts/entities/account.entity';

const decimalToNumber = {
  to: (v: number): number => v,
  from: (v: string | number): number => Number(v),
};

@Entity('transfers')
export class Transfer extends AbstractEntity<Transfer> {
  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Index()
  @Column({ type: 'uuid' })
  fromAccountId!: string;

  @ManyToOne(() => Account, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fromAccountId' })
  fromAccount!: Account;

  @Index()
  @Column({ type: 'uuid' })
  toAccountId!: string;

  @ManyToOne(() => Account, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'toAccountId' })
  toAccount!: Account;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: decimalToNumber })
  amount!: number;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  transactedAt!: Date;
}
