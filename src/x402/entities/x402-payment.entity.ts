import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { X402Quote } from './x402-quote.entity';

@Entity('x402_payments')
@Index(['dataOwnerId', 'paidAt'])
@Index(['quoteId'], { unique: true })
export class X402Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { unique: true })
  quoteId!: string;

  @Column('uuid')
  dataOwnerId!: string;

  @Column('text')
  transactionSignature!: string;

  @Column('text')
  recipientPublicKey!: string;

  @Column('text')
  tokenMint!: string;

  @Column('bigint')
  amountBaseUnits!: number;

  @Column('text', { nullable: true })
  memo?: string;

  @Column('timestamp')
  paidAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToOne(() => X402Quote, (quote) => quote.payment)
  @JoinColumn({ name: 'quoteId' })
  quote!: X402Quote;
}
