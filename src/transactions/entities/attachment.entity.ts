import { Column, Entity, Index } from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';

// 'receipt' | 'invoice' | 'image'
export type AttachmentKind = 'receipt' | 'invoice' | 'image';

@Entity('attachments')
export class Attachment extends AbstractEntity<Attachment> {
  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  // Nullable: an attachment may exist before it is linked to a transaction
  // (e.g. uploaded from camera before completing the draft).
  @Column({ type: 'uuid', nullable: true })
  transactionId!: string | null;

  @Column({ type: 'varchar' })
  url!: string;

  @Column({ type: 'varchar' })
  kind!: AttachmentKind;

  // Arbitrary provider metadata: dimensions, OCR text, S3 key, etc.
  @Column({ type: 'jsonb', default: {} })
  meta!: Record<string, unknown>;
}
