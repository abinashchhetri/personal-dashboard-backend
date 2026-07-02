// src/users/entities/user.entity.ts
// ─────────────────────────────────────────────────────────────────────────────
// User Entity
// ─────────────────────────────────────────────────────────────────────────────
// Database schema for the users table.
// Only Google OAuth login is supported — no password column.
// ─────────────────────────────────────────────────────────────────────────────

import { Column, Entity } from 'typeorm';

import { AbstractEntity } from 'src/common/database/abstract.entity';
import { UserRoleEnum } from '../enums/user-role.enum';

@Entity('users')
export class User extends AbstractEntity<User> {
  @Column({ unique: true })
  googleId!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true, type: 'varchar' })
  avatarUrl!: string | null;

  @Column({ type: 'enum', enum: UserRoleEnum, default: UserRoleEnum.USER })
  role!: UserRoleEnum;
}
