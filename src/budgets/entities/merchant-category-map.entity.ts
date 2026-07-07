import { Column, Entity, Index } from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';

// Learned merchant → category mapping. Every time the user confirms a category
// for a merchant the hitCount increments, making future auto-categorisation
// progressively more accurate.
@Index('UQ_merchant_category_map_user_key', ['userId', 'merchantKey'], { unique: true })
@Entity('merchant_category_map')
export class MerchantCategoryMap extends AbstractEntity<MerchantCategoryMap> {
  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  // Always stored lowercase so lookups are case-insensitive without LOWER().
  @Column({ type: 'varchar' })
  merchantKey!: string;

  @Column({ type: 'uuid' })
  categoryId!: string;

  // How many times this mapping has been confirmed; higher = stronger signal.
  @Column({ type: 'int', default: 1 })
  hitCount!: number;
}
