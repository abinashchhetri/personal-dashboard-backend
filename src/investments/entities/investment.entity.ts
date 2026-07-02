import { Column, Entity, Index, OneToMany } from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';
import { InvestmentTypeEnum } from '../enums/investment-type.enum';
import { InvestmentHistory } from './investment-history.entity';
import { InvestmentTransaction } from './investment-transaction.entity';

const decimalToNumber = {
  to: (v: number): number => v,
  from: (v: string | number): number => Number(v),
};

@Entity('investments')
export class Investment extends AbstractEntity<Investment> {
  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'enum', enum: InvestmentTypeEnum })
  type!: InvestmentTypeEnum;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: decimalToNumber })
  investedAmount!: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true, transformer: decimalToNumber })
  currentValue!: number | null;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @OneToMany(() => InvestmentHistory, (h) => h.investment, { cascade: true })
  history!: InvestmentHistory[];

  @OneToMany(() => InvestmentTransaction, (t) => t.investment, { cascade: true })
  transactions!: InvestmentTransaction[];
}
