import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';
import { Investment } from './investment.entity';

const decimalToNumber = {
  to: (v: number): number => v,
  from: (v: string | number): number => Number(v),
};

@Entity('investment_history')
export class InvestmentHistory extends AbstractEntity<InvestmentHistory> {
  @Index()
  @Column({ type: 'uuid' })
  investmentId!: string;

  @ManyToOne(() => Investment, (inv) => inv.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'investmentId' })
  investment!: Investment;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: decimalToNumber })
  valueSnapshot!: number;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  recordedAt!: Date;
}
