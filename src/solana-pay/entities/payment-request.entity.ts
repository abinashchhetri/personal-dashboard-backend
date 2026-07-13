import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from 'src/common/database/abstract.entity';
import { PaymentStatusEnum } from '../enums/payment-status.enum';

@Entity('payment_requests')
@Index(['userId'])
@Index(['userId', 'status'])
export class PaymentRequest extends AbstractEntity<PaymentRequest> {
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'decimal', precision: 14, scale: 6 })
  amountUsdc!: number;

  @Column({ type: 'text', nullable: true })
  label!: string | null;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({ type: 'text', nullable: true })
  memo!: string | null;

  @Column({ type: 'text' })
  referencePublicKey!: string;

  @Column({
    type: 'varchar',
    default: PaymentStatusEnum.PENDING,
  })
  status!: PaymentStatusEnum;

  @Column({ type: 'text', nullable: true })
  transactionSignature!: string | null;

  @Column({ type: 'uuid', nullable: true })
  accountId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  autoLoggedTransactionId!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  confirmedAt!: Date | null;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;
}
