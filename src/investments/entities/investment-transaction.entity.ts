import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';
import { InvestmentTransactionTypeEnum } from '../enums/transaction-type.enum';
import { Investment } from './investment.entity';

const decimalToNumber = {
  to: (v: number): number => v,
  from: (v: string | number): number => Number(v),
};

@Entity('investment_transactions')
export class InvestmentTransaction extends AbstractEntity<InvestmentTransaction> {
  @Index()
  @Column({ type: 'uuid' })
  investmentId!: string;

  @ManyToOne(() => Investment, (inv) => inv.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'investmentId' })
  investment!: Investment;

  @Column({ type: 'enum', enum: InvestmentTransactionTypeEnum })
  transactionType!: InvestmentTransactionTypeEnum;

  // scale 4 to allow fractional units (e.g. SIP funds), whole shares for NEPSE.
  @Column({ type: 'decimal', precision: 14, scale: 4, transformer: decimalToNumber })
  quantity!: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: decimalToNumber })
  pricePerUnit!: number;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  transactionDate!: Date;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true, transformer: decimalToNumber })
  brokerageFee!: number | null;

  // Locked in at write time from the average buy price at that moment — never
  // recalculated retroactively, even if later buys shift the running average.
  // Only set on SELL rows; null on BUY rows.
  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true, transformer: decimalToNumber })
  realizedGainLoss!: number | null;

  @Column({ type: 'varchar', nullable: true })
  note!: string | null;
}
