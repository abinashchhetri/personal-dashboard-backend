import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  OneToOne,
} from 'typeorm';
import { PaymentStatusEnum } from '../enums/payment-status.enum';
import { X402Payment } from './x402-payment.entity';

@Entity('x402_quotes')
@Index(['status', 'expiresAt'])
export class X402Quote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  dataOwnerId!: string;

  @Column({
    type: 'enum',
    enum: PaymentStatusEnum,
    default: PaymentStatusEnum.ISSUED,
  })
  status!: PaymentStatusEnum;

  @Column('text')
  referencePublicKey!: string;

  @Column('timestamp')
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToOne(() => X402Payment, (payment) => payment.quote, {
    nullable: true,
  })
  payment?: X402Payment;
}
