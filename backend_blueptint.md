# Backend Project Blueprint

> **Non-negotiable.** This is the master reference for every backend project. Every rule here exists to protect separation of concerns, maintainability, scalability, and security. No exceptions without a documented reason.

---

## Table of Contents

1. [Stack and Tools](#1-stack-and-tools)
2. [Folder Structure](#2-folder-structure)
3. [Naming Conventions](#3-naming-conventions)
4. [Module Rules](#4-module-rules)
5. [Controller Rules](#5-controller-rules)
6. [Service Rules](#6-service-rules)
7. [Repository Pattern](#7-repository-pattern)
8. [Entities](#8-entities)
9. [DTOs and Validation](#9-dtos-and-validation)
10. [Enums](#10-enums)
11. [Guards and Decorators](#11-guards-and-decorators)
12. [Common Module](#12-common-module)
13. [Configuration and Environment](#13-configuration-and-environment)
14. [Constants](#14-constants)
15. [Interfaces](#15-interfaces)
16. [Error Handling](#16-error-handling)
17. [Response Format Standard](#17-response-format-standard)
18. [Logging](#18-logging)
19. [Optional Integrations](#19-optional-integrations)
20. [Database Migrations](#20-database-migrations)
21. [Security Rules](#21-security-rules)
22. [Comment Standard](#22-comment-standard)
23. [What is Forbidden](#23-what-is-forbidden)

---

## 1. Stack and Tools

| Concern | Tool |
|---|---|
| Framework | NestJS |
| Language | TypeScript (strict mode) |
| ORM | TypeORM |
| Database | PostgreSQL |
| Validation | class-validator + class-transformer |
| Auth | Passport.js + JWT (access + refresh tokens) |
| File Storage | AWS S3 (optional — see §19) |
| Queue | Bull + Redis (optional — see §19) |
| Email | Nodemailer / Brevo (optional — see §19) |
| Docs | Swagger (OpenAPI) |
| Logger | nestjs-pino |
| Security | helmet, hpp, bcrypt |
| Config | @nestjs/config + .env files |

---

## 2. Folder Structure

```
project-root/
│
├── src/
│   ├── main.ts                       # Bootstrap — server setup, guards, pipes, middleware
│   ├── app.module.ts                 # Root module — imports all feature modules
│   ├── app.service.ts                # App-level health/utility service
│   │
│   ├── common/                       # Shared infrastructure — not a feature module
│   │   ├── constants/                # App-wide constant values
│   │   │   └── index.ts
│   │   ├── database/                 # TypeORM abstract base classes
│   │   │   ├── abstract.entity.ts    # Base entity (id, createdAt, updatedAt)
│   │   │   ├── abstract.repository.ts# Base repository (find, create, update, delete)
│   │   │   └── database.module.ts    # TypeORM connection config
│   │   ├── decorators/               # Custom parameter and method decorators
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── roles.decorator.ts
│   │   │   └── index.ts
│   │   ├── dtos/                     # Shared DTOs reused across features
│   │   │   └── pagination.dto.ts
│   │   ├── filters/                  # Global exception filters
│   │   │   └── http-exception.filter.ts
│   │   ├── guards/                   # Shared guards (optional — feature guards live in feature)
│   │   ├── helpers/                  # Pure utility functions (no side effects)
│   │   │   └── index.ts
│   │   ├── interceptors/             # Response transform, logging interceptors
│   │   │   └── transform.interceptor.ts
│   │   ├── interfaces/               # Shared TypeScript interfaces
│   │   │   └── index.ts
│   │   └── logger/                   # Pino logger module
│   │       └── logger.module.ts
│   │
│   ├── auth/                         # Authentication feature module
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   └── register.dto.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── role-auth.guard.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── refresh.strategy.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   └── auth.service.ts
│   │
│   └── [feature]/                    # One folder per domain feature
│       ├── dto/                      # DTOs scoped to this feature
│       │   ├── create-[feature].dto.ts
│       │   ├── update-[feature].dto.ts
│       │   └── find-all-[feature].dto.ts
│       ├── entities/                 # TypeORM entities for this feature
│       │   └── [feature].entity.ts
│       ├── enums/                    # Enums scoped to this feature
│       │   └── [feature]-status.enum.ts
│       ├── repositories/             # Repository class for this feature
│       │   └── [feature].repository.ts
│       ├── [feature].controller.ts
│       ├── [feature].module.ts
│       ├── [feature].service.ts
│       └── [feature].controller.spec.ts  # Unit tests
│
├── migrations/                       # TypeORM migration files
├── mails/                            # Email templates (optional — see §19)
├── test/                             # E2E tests
├── .env                              # Local secrets — NEVER committed
├── .env.example                      # Safe template — committed with empty values
├── typeorm.config.ts                 # TypeORM CLI config (migrations)
├── nest-cli.json
├── tsconfig.json
└── tsconfig.build.json
```

### Rule: What goes where

| Concern | Location |
|---|---|
| Bootstrap and middleware | `src/main.ts` |
| Module wiring | `src/[feature]/[feature].module.ts` |
| HTTP route handlers | `src/[feature]/[feature].controller.ts` |
| Business logic | `src/[feature]/[feature].service.ts` |
| Database queries | `src/[feature]/repositories/[feature].repository.ts` |
| Database schema | `src/[feature]/entities/[feature].entity.ts` |
| Request body shapes | `src/[feature]/dto/*.dto.ts` |
| Feature-scoped enums | `src/[feature]/enums/` |
| Auth guards | `src/auth/guards/` |
| Shared decorators | `src/common/decorators/` |
| Shared DTOs | `src/common/dtos/` |
| Shared interfaces | `src/common/interfaces/` |
| Pure helper functions | `src/common/helpers/` |
| App-wide constants | `src/common/constants/` |
| Optional integrations | `src/common/[integration]/` (aws/, email/, queue/) |

---

## 3. Naming Conventions

### Files

```
[feature].controller.ts       kebab-case, always suffixed
[feature].service.ts          kebab-case, always suffixed
[feature].module.ts           kebab-case, always suffixed
[feature].repository.ts       kebab-case, always suffixed
[feature].entity.ts           kebab-case, always suffixed
create-[feature].dto.ts       kebab-case, verb prefix, always suffixed
update-[feature].dto.ts
find-all-[feature].dto.ts
[feature]-status.enum.ts      kebab-case, always suffixed
jwt-auth.guard.ts
current-user.decorator.ts
```

### Classes and interfaces

```typescript
// Controllers       PascalCase + Controller suffix
class UsersController {}
class MassageCentersController {}

// Services          PascalCase + Service suffix
class UsersService {}

// Repositories      PascalCase + Repository suffix
class UsersRepository {}

// Entities          PascalCase — no suffix, mirrors the DB table concept
class User {}
class MassageCenter {}

// DTOs              PascalCase + Dto suffix — verb + noun + Dto
class CreateUserDto {}
class UpdateUserDto {}
class FindAllUsersDto {}
class LoginDto {}

// Interfaces        I-prefix, PascalCase
interface IPayload {}
interface ISuccessResponse {}

// Enums             SCREAMING_SNAKE_CASE values, PascalCase type name
enum UserRoleEnum { ADMIN = 'ADMIN', USER = 'USER' }
enum StatusEnum { ACTIVE = 'ACTIVE', INACTIVE = 'INACTIVE' }

// Constants         SCREAMING_SNAKE_CASE
const JWT_SECRET = '...'
const MAX_FILE_SIZE_MB = 5
```

---

## 4. Module Rules

Every feature has exactly one module file that declares and exports its own pieces.

```typescript
// src/users/users.module.ts
// ─────────────────────────────────────────────────────────────────────────────
// UsersModule
// ─────────────────────────────────────────────────────────────────────────────
// Owns everything related to the user domain: entity, repository, service,
// controller. Export UsersService so other modules can inject it.
// ─────────────────────────────────────────────────────────────────────────────

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersRepository } from './repositories/users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],   // export only what other modules actually need
})
export class UsersModule {}
```

### Module rules checklist

- [ ] `TypeOrmModule.forFeature([Entity])` imports only the entities this module owns
- [ ] Only export what other modules genuinely depend on — not the repository
- [ ] Never import another module's repository directly — go through its service
- [ ] Never put business logic inside a module file

---

## 5. Controller Rules

Controllers handle HTTP routing only. No business logic, no DB calls, no conditionals.

```typescript
// src/users/users.controller.ts
// ─────────────────────────────────────────────────────────────────────────────
// UsersController
// ─────────────────────────────────────────────────────────────────────────────
// HTTP handlers for the /users route group.
// Delegates all work to UsersService — no logic lives here.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser, Roles } from 'src/common/decorators';
import { IPayload } from 'src/common/interfaces';

import { JwtGuard } from 'src/auth/guards/jwt-auth.guard';
import { JwtRoleGuard } from 'src/auth/guards/role-auth.guard';
import { UserRoleEnum } from 'src/users/enums/user-role.enum';

import { CreateUserDto } from './dto/create-user.dto';
import { FindAllUsersDto } from './dto/find-all-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.usersService.create(createUserDto, payload);
  }

  @Get()
  @Roles(UserRoleEnum.ADMIN)
  @UseGuards(JwtRoleGuard)
  @ApiBearerAuth()
  findAll(@Query() findAllUsersDto: FindAllUsersDto) {
    return this.usersService.findAll(findAllUsersDto);
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.usersService.update(id, updateUserDto, payload);
  }

  @Delete(':id')
  @Roles(UserRoleEnum.ADMIN)
  @UseGuards(JwtRoleGuard)
  @ApiBearerAuth()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}
```

### Controller rules checklist

- [ ] `@ApiTags` decorator on every controller for Swagger grouping
- [ ] `@ApiBearerAuth()` on every protected route
- [ ] `ParseUUIDPipe` on every UUID route param — never raw unvalidated string IDs
- [ ] Guard placement: `@UseGuards` goes above the handler, role guards pair with `@Roles`
- [ ] No `if/else`, no DB calls, no formatting — delegate 100% to the service
- [ ] Header comment at the top of every file

---

## 6. Service Rules

Services contain all business logic. They talk to repositories, other services, and optional integrations (email, S3, queue). They never talk to HTTP directly.

```typescript
// src/users/users.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// UsersService
// ─────────────────────────────────────────────────────────────────────────────
// All business logic for the user domain.
// Depends on UsersRepository for data access.
// Throws NestJS HTTP exceptions — never raw Errors.
// ─────────────────────────────────────────────────────────────────────────────

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { IPayload } from 'src/common/interfaces';
import { PaginationQueryDto } from 'src/common/dtos/pagination.dto';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './repositories/users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto, payload: IPayload) {
    const existing = await this.usersRepository.entityRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existing) throw new BadRequestException('Email already in use');

    const hashed = await bcrypt.hash(createUserDto.password, 10);
    return this.usersRepository.create({ ...createUserDto, password: hashed });
  }

  async findAll({ page = 1, limit = 10 }: PaginationQueryDto) {
    const [data, total] = await this.usersRepository.entityRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page, limit };
  }

  async findOne(id: string) {
    return this.usersRepository.findOne({ id });
  }

  async update(id: string, updateUserDto: UpdateUserDto, payload: IPayload) {
    await this.usersRepository.findOneAndUpdate({ id }, updateUserDto);
    return { message: 'User updated successfully' };
  }

  async remove(id: string) {
    await this.usersRepository.findOneAndDelete({ id });
    return { message: 'User deleted successfully' };
  }
}
```

### Transactions — always use QueryRunner for multi-step writes

```typescript
async createWithRelations(dto: CreateUserDto, payload: IPayload) {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const user = queryRunner.manager.create(User, dto);
    await queryRunner.manager.save(user);

    // additional related inserts here

    await queryRunner.commitTransaction();
    return user;
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
}
```

### Service rules checklist

- [ ] All exceptions are NestJS HTTP exceptions (`BadRequestException`, `NotFoundException`, etc.)
- [ ] Never `throw new Error()` — use the NestJS exception classes
- [ ] Multi-step DB writes always use a `QueryRunner` transaction
- [ ] Inject other services, never other modules' repositories directly
- [ ] Passwords are always hashed with bcrypt before persistence — never stored plain
- [ ] Return plain objects or entities — never HTTP response objects
- [ ] Optional integrations (email, S3, queue) are injected as services, called after the primary operation succeeds

---

## 7. Repository Pattern

Every feature has its own repository that extends `AbstractRepository`. The abstract base provides `findOne`, `find`, `create`, `findOneAndUpdate`, `findOneAndDelete`. Complex queries are added as methods on the feature repository.

### Abstract base

```typescript
// src/common/database/abstract.repository.ts
// ─────────────────────────────────────────────────────────────────────────────
// AbstractRepository
// ─────────────────────────────────────────────────────────────────────────────
// Generic CRUD base shared by every feature repository.
// Feature repos extend this and add their own custom query methods.
// ─────────────────────────────────────────────────────────────────────────────

import { Logger, NotFoundException } from '@nestjs/common';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { AbstractEntity } from './abstract.entity';

export abstract class AbstractRepository<T extends AbstractEntity<T>> {
  protected abstract readonly logger: Logger;

  constructor(
    public readonly entityRepository: Repository<T>,
    private readonly entityManager: EntityManager,
  ) {}

  async create(entity: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>) {
    return this.entityManager.save(entity);
  }

  async findOne(where: FindOptionsWhere<T>): Promise<T> {
    const entity = await this.entityRepository.findOne({ where });
    if (!entity) {
      this.logger.warn('Entity not found', where);
      throw new NotFoundException('Record not found');
    }
    return entity;
  }

  async findOneAndUpdate(
    where: FindOptionsWhere<T>,
    partial: QueryDeepPartialEntity<T>,
  ) {
    const result = await this.entityRepository.update(where, partial);
    if (!result.affected) {
      this.logger.warn('Update target not found', where);
      throw new NotFoundException('Record not found');
    }
    return result;
  }

  async find(where: FindOptionsWhere<T>): Promise<T[]> {
    return this.entityRepository.findBy(where);
  }

  async findOneAndDelete(where: FindOptionsWhere<T>) {
    return this.entityRepository.delete(where);
  }
}
```

### Feature repository

```typescript
// src/users/repositories/users.repository.ts
// ─────────────────────────────────────────────────────────────────────────────
// UsersRepository
// ─────────────────────────────────────────────────────────────────────────────
// Data access layer for the User entity.
// Extend with custom query methods as the feature grows.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { AbstractRepository } from 'src/common/database/abstract.repository';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersRepository extends AbstractRepository<User> {
  protected readonly logger = new Logger(UsersRepository.name);

  constructor(
    @InjectRepository(User)
    entityRepository: Repository<User>,
    entityManager: EntityManager,
  ) {
    super(entityRepository, entityManager);
  }

  // Custom queries go here — keep them narrow and named by intent
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.entityRepository
      .createQueryBuilder('user')
      .addSelect('user.password')  // password is normally select: false
      .where('user.email = :email', { email })
      .getOne();
  }
}
```

### Repository rules checklist

- [ ] Every feature has its own repository — never share repositories between features
- [ ] Custom query methods are named by intent (`findByEmailWithPassword`, not `findCustom`)
- [ ] Use `createQueryBuilder` for complex joins or conditional filters
- [ ] Never expose raw SQL strings in service files — encapsulate in the repository
- [ ] Logger is always set to the repository's class name

---

## 8. Entities

All entities extend `AbstractEntity` which provides `id`, `createdAt`, `updatedAt`. The primary key is a UUID generated by PostgreSQL's `gen_random_uuid()` (via the `pgcrypto` extension) rather than an auto-increment integer.

```typescript
// src/common/database/abstract.entity.ts
// ─────────────────────────────────────────────────────────────────────────────
// AbstractEntity
// ─────────────────────────────────────────────────────────────────────────────
// Base entity shared by every feature entity.
// id is a Postgres-generated UUID (gen_random_uuid(), pgcrypto extension).
// createdAt/updatedAt use timestamptz so values are stored with timezone info.
// ─────────────────────────────────────────────────────────────────────────────

import { Column, PrimaryGeneratedColumn } from 'typeorm';

export class AbstractEntity<T> {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  constructor(entity: Partial<T>) {
    Object.assign(this, entity);
  }
}
```

> **Note:** Postgres has no native `onUpdate` column option like MySQL. `updatedAt` is refreshed in code — either via a `@BeforeUpdate()` TypeORM hook on `AbstractEntity`, or by explicitly setting `updatedAt: new Date()` in `findOneAndUpdate` calls. Pick one approach project-wide and apply it consistently; a `@BeforeUpdate()` hook on `AbstractEntity` is the simpler default since every entity inherits it for free.

```typescript
// src/users/entities/user.entity.ts
// ─────────────────────────────────────────────────────────────────────────────
// User Entity
// ─────────────────────────────────────────────────────────────────────────────
// Database schema for the users table.
// password is select:false — never returned by default queries.
// ─────────────────────────────────────────────────────────────────────────────

import { Column, Entity, OneToMany } from 'typeorm';
import { AbstractEntity } from 'src/common/database/abstract.entity';
import { UserRoleEnum } from '../enums/user-role.enum';

@Entity('users')
export class User extends AbstractEntity<User> {
  @Column({ unique: true })
  email: string;

  @Column({ select: false })   // never returned unless explicitly selected
  password: string;

  @Column()
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ type: 'enum', enum: UserRoleEnum, default: UserRoleEnum.USER })
  role: UserRoleEnum;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  avatarUrl: string;
}
```

### Entity rules checklist

- [ ] Always extend `AbstractEntity` — never define `id`, `createdAt`, `updatedAt` manually
- [ ] `@Entity('table_name')` — always pass an explicit snake_case table name
- [ ] `select: false` on any column that must not be in default query results (passwords, tokens)
- [ ] `nullable: true` for optional fields — do not use TypeScript `?` alone
- [ ] Relationships are defined with `@OneToMany`, `@ManyToOne`, `@ManyToMany` — always with `eager: false`
- [ ] `@Column({ type: 'jsonb' })` for any flexible/structured data column (metadata, keywords, settings) — never `'json'`, since `jsonb` is indexable and faster to query in Postgres
- [ ] No business logic inside entity classes

---

## 9. DTOs and Validation

DTOs define what the API accepts. Every DTO property must have at least one class-validator decorator.

```typescript
// src/users/dto/create-user.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// CreateUserDto
// ─────────────────────────────────────────────────────────────────────────────
// Validates the request body for POST /users.
// All fields are validated before the controller method runs.
// ─────────────────────────────────────────────────────────────────────────────

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import { UserRoleEnum } from '../enums/user-role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail({}, { message: 'Provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePass123' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ enum: UserRoleEnum, default: UserRoleEnum.USER })
  @IsEnum(UserRoleEnum)
  @IsOptional()
  role?: UserRoleEnum;
}
```

```typescript
// src/users/dto/update-user.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

// All fields optional — inherits validation from CreateUserDto
export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

```typescript
// src/common/dtos/pagination.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
// PaginationQueryDto
// ─────────────────────────────────────────────────────────────────────────────
// Shared pagination params used across all list endpoints.
// ─────────────────────────────────────────────────────────────────────────────

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;
}
```

### DTO rules checklist

- [ ] Every property has at least one validator decorator
- [ ] `@ApiProperty` or `@ApiPropertyOptional` on every property for Swagger
- [ ] Use `PartialType(CreateDto)` for update DTOs — never duplicate validators
- [ ] Query param DTOs always use `@Type(() => Number)` before `@IsInt()` — query strings arrive as strings
- [ ] Route param UUIDs are validated with `ParseUUIDPipe` at the controller, not re-validated in a DTO
- [ ] Validation error messages are user-readable: `'Email must be valid'` not `'isEmail'`
- [ ] `whitelist: true` is set globally in `main.ts` — unknown fields are stripped automatically

---

## 10. Enums

Enums are feature-scoped. Shared enums that cross multiple features live in `src/common/`. In Postgres, a TypeORM string enum column is created as a native Postgres `ENUM` type under the hood — no extra configuration needed beyond `@Column({ type: 'enum', enum: X })`, same as the entity pattern in §8.

```typescript
// src/users/enums/user-role.enum.ts
export enum UserRoleEnum {
  ADMIN = 'ADMIN',
  USER = 'USER',
  MODERATOR = 'MODERATOR',
}
```

```typescript
// src/users/enums/user-status.enum.ts
export enum UserStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}
```

### Enum rules checklist

- [ ] Always string enums — never numeric (they serialize clearly in DB and responses)
- [ ] Values match the key name exactly in SCREAMING_SNAKE_CASE
- [ ] One file per enum — never define multiple enums in one file
- [ ] If an enum is used across more than one feature, move it to `src/common/enums/`
- [ ] Renaming an enum value later requires a migration that alters the Postgres `ENUM` type (`ALTER TYPE ... RENAME VALUE`) — plan enum values carefully up front since changing them is more involved in Postgres than in MySQL

---

## 11. Guards and Decorators

### Guards

```typescript
// src/auth/guards/jwt-auth.guard.ts
// ─────────────────────────────────────────────────────────────────────────────
// JwtGuard
// ─────────────────────────────────────────────────────────────────────────────
// Validates the Bearer token on every protected route.
// Attach with @UseGuards(JwtGuard).
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {}
```

```typescript
// src/auth/guards/role-auth.guard.ts
// ─────────────────────────────────────────────────────────────────────────────
// JwtRoleGuard
// ─────────────────────────────────────────────────────────────────────────────
// Validates token AND checks that the user's role matches @Roles(...).
// Use when a route is restricted to specific roles.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { UserRoleEnum } from 'src/users/enums/user-role.enum';

@Injectable()
export class JwtRoleGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const required = this.reflector.getAllAndOverride<UserRoleEnum[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    const hasRole = required.includes(user.role);
    if (!hasRole) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}
```

### Custom decorators

```typescript
// src/common/decorators/current-user.decorator.ts
// ─────────────────────────────────────────────────────────────────────────────
// @CurrentUser()
// ─────────────────────────────────────────────────────────────────────────────
// Extracts the JWT payload from the request object.
// Only works on routes protected by JwtGuard or JwtRoleGuard.
// ─────────────────────────────────────────────────────────────────────────────

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest().user;
  },
);
```

```typescript
// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRoleEnum } from 'src/users/enums/user-role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRoleEnum[]) => SetMetadata(ROLES_KEY, roles);
```

---

## 12. Common Module

The `common/` folder is not a NestJS module — it is infrastructure shared across feature modules. Pieces from `common/` are imported directly where needed.

### Shared interface pattern

```typescript
// src/common/interfaces/payload.interface.ts
// ─────────────────────────────────────────────────────────────────────────────
// IPayload
// ─────────────────────────────────────────────────────────────────────────────
// Shape of the JWT payload attached to req.user after authentication.
// id is a string because primary keys are Postgres UUIDs, not integers.
// ─────────────────────────────────────────────────────────────────────────────

export interface IPayload {
  id: string;
  email: string;
  role: string;
}
```

```typescript
// src/common/interfaces/success-response.interface.ts
export interface ISuccessResponse<T = null> {
  success: true;
  message: string;
  data: T;
}
```

### Transform interceptor

```typescript
// src/common/interceptors/transform.interceptor.ts
// ─────────────────────────────────────────────────────────────────────────────
// TransformInterceptor
// ─────────────────────────────────────────────────────────────────────────────
// Wraps every successful response in a standard envelope:
// { success: true, message: 'OK', data: <actual payload> }
// Applied globally in main.ts so no controller needs to do this manually.
// ─────────────────────────────────────────────────────────────────────────────

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        message: data?.message ?? 'Success',
        data: data?.data ?? data,
      })),
    );
  }
}
```

### Global exception filter

```typescript
// src/common/filters/http-exception.filter.ts
// ─────────────────────────────────────────────────────────────────────────────
// HttpExceptionFilter
// ─────────────────────────────────────────────────────────────────────────────
// Catches all unhandled HTTP exceptions and returns a consistent error shape.
// Applied globally in main.ts.
// ─────────────────────────────────────────────────────────────────────────────

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception.getResponse();
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message ?? 'An error occurred';

    this.logger.error(`${request.method} ${request.url} → ${status}`);

    response.status(status).json({
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? message[0] : message,
      errors: Array.isArray(message) ? message : undefined,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

### Pure helpers

```typescript
// src/common/helpers/pagination.helper.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pagination Helpers
// ─────────────────────────────────────────────────────────────────────────────
// Pure functions for building paginated responses.
// No imports from NestJS, services, or repositories.
// ─────────────────────────────────────────────────────────────────────────────

export const getPaginationMeta = (total: number, page: number, limit: number) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPrevPage: page > 1,
});

export const getSkip = (page: number, limit: number) => (page - 1) * limit;
```

---

## 13. Configuration and Environment

### main.ts bootstrap pattern

```typescript
// src/main.ts

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as hpp from 'hpp';
import * as cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

const setupSwagger = (app: INestApplication) => {
  const config = new DocumentBuilder()
    .setTitle('Project API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.use(hpp());
  app.use(cookieParser());

  // Global prefix
  const prefix = configService.get<string>('PREFIX') ?? '/api/v1';
  app.setGlobalPrefix(prefix);

  // Global validation
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Global response shaping
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global error shaping
  app.useGlobalFilters(new HttpExceptionFilter());

  // Logger
  app.useLogger(app.get(Logger));

  // Swagger — disable in production if desired
  if (configService.get('NODE_ENV') !== 'production') {
    setupSwagger(app);
  }

  // CORS — list allowed origins explicitly, never use wildcard in production
  app.enableCors({
    origin: configService.get<string>('CLIENT_URL')?.split(',') ?? [],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
}

bootstrap();
```

### .env.example — committed, empty values

```env
# ─── App ──────────────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=3000
PREFIX=/api/v1
CLIENT_URL=http://localhost:3000

# ─── Database (PostgreSQL) ────────────────────────────────────────────────────
DB_HOST=
DB_PORT=5432
DB_USERNAME=
DB_PASSWORD=
DB_NAME=

# ─── Auth ─────────────────────────────────────────────────────────────────────
JWT_SECRET=
JWT_EXPIRY=15m
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRY=7d
BCRYPT_SALT=10

# ─── Swagger (optional) ───────────────────────────────────────────────────────
SWAGGER_USERNAME=
SWAGGER_PASSWORD=

# ─── Redis / Queue (optional) ─────────────────────────────────────────────────
REDIS_HOST=
REDIS_PORT=6379

# ─── AWS S3 (optional) ────────────────────────────────────────────────────────
AWS_ACCESS_KEY=
AWS_SECRET_KEY=
AWS_S3_BUCKET=
AWS_REGION=

# ─── Email / SMTP (optional) ──────────────────────────────────────────────────
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

# ─── OAuth (optional) ─────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
OAUTH_SESSION_SECRET=
OAUTH_SESSION_EXPIRY=86400000

# ─── Stripe (optional) ────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

### Config rules checklist

- [ ] `.env` is in `.gitignore` — never committed
- [ ] `.env.example` is committed with every key present but empty values
- [ ] `ConfigModule.forRoot({ isGlobal: true })` is set in `AppModule` — inject `ConfigService`, never use `process.env` directly in service code
- [ ] Every optional integration has its keys grouped under a clear comment block in `.env.example`
- [ ] Production environments use a secrets manager (AWS Secrets Manager, Vault) — not raw env files
- [ ] The Postgres database has the `pgcrypto` extension enabled (`CREATE EXTENSION IF NOT EXISTS pgcrypto;`) so `gen_random_uuid()` is available for primary keys — run this once per database before the first migration

---

## 14. Constants

All hardcoded values that appear in more than one file live in `src/common/constants/`.

```typescript
// src/common/constants/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// App Constants
// ─────────────────────────────────────────────────────────────────────────────
// Centralised app-wide constant values.
// Feature-specific constants stay inside the feature folder.
// ─────────────────────────────────────────────────────────────────────────────

export const BCRYPT_SALT_ROUNDS = 10;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;   // 5 MB
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const DEFAULT_PAGINATION_LIMIT = 10;
export const DEFAULT_PAGINATION_MAX = 100;

// Cookie names
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

// Swagger details
export const SWAGGER_DETAILS = {
  title: 'Project API',
  description: 'REST API documentation',
  version: '1.0',
} as const;
```

### Constant rules

- Primitive constants → `SCREAMING_SNAKE_CASE`
- Object/array constants → `SCREAMING_SNAKE_CASE` with `as const`
- Feature-specific constants → live inside `src/[feature]/constants/` not in `common/`
- Never hardcode values (limits, magic numbers, cookie names) inline in a service or controller

---

## 15. Interfaces

Shared interfaces that cross feature boundaries live in `src/common/interfaces/`.

```typescript
// src/common/interfaces/index.ts
export * from './payload.interface';
export * from './success-response.interface';
export * from './paginated-response.interface';
```

```typescript
// src/common/interfaces/paginated-response.interface.ts
export interface IPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
```

### Interface rules

- `I` prefix on all interfaces: `IPayload`, `ISuccessResponse`
- Feature-scoped interfaces live inside `src/[feature]/interfaces/` — not in `common/`
- No `any` — use `unknown` and narrow, or define the proper interface
- Never use an interface to describe a DTO or entity that already has a class — the class is the type

---

## 16. Error Handling

### Exception hierarchy — always use NestJS built-ins

| Situation | Exception |
|---|---|
| Record not found | `NotFoundException` |
| Invalid input / business rule violation | `BadRequestException` |
| Not authenticated | `UnauthorizedException` |
| Authenticated but missing permission | `ForbiddenException` |
| Record already exists | `ConflictException` |
| External service failed | `ServiceUnavailableException` |
| Anything unexpected | `InternalServerErrorException` |

```typescript
// Correct usage
import { NotFoundException, BadRequestException } from '@nestjs/common';

if (!user) throw new NotFoundException('User not found');
if (existing) throw new ConflictException('Email already registered');
```

### Rules

- Never `throw new Error()` — always a NestJS HTTP exception
- Never catch and swallow errors silently — rethrow or let the global filter handle it
- Log unexpected errors with context before re-throwing
- The global `HttpExceptionFilter` shapes the response — do not write custom JSON error responses in services
- Postgres unique-constraint violations surface as a driver error with `code: '23505'` — catch this in the repository or service and re-throw as a `ConflictException` with a readable message, rather than letting the raw Postgres error leak to the client

---

## 17. Response Format Standard

All responses follow one envelope shape — enforced by the `TransformInterceptor`.

### Success response

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "8f14e45f-ceea-4a6f-a3b9-7f0b1e2c4d5e",
    "email": "john@example.com",
    "firstName": "John"
  }
}
```

### Paginated response

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "data": [...],
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Error response

```json
{
  "success": false,
  "statusCode": 404,
  "message": "User not found",
  "timestamp": "2026-06-27T10:30:00.000Z",
  "path": "/api/v1/users/8f14e45f-ceea-4a6f-a3b9-7f0b1e2c4d5e"
}
```

### Validation error response

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Provide a valid email address",
  "errors": [
    "Provide a valid email address",
    "Password must be at least 8 characters"
  ],
  "timestamp": "2026-06-27T10:30:00.000Z",
  "path": "/api/v1/users"
}
```

---

## 18. Logging

Use `nestjs-pino` for structured JSON logging. Never use `console.log` in committed code.

```typescript
// src/common/logger/logger.module.ts
// ─────────────────────────────────────────────────────────────────────────────
// CustomLoggerModule
// ─────────────────────────────────────────────────────────────────────────────
// Pino logger configured for structured JSON output.
// In development, pino-pretty formats logs for readability.
// ─────────────────────────────────────────────────────────────────────────────

import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        redact: ['req.headers.authorization', 'req.body.password'],  // never log secrets
      },
    }),
  ],
})
export class CustomLoggerModule {}
```

### Logging rules

- Use injected `Logger` from `@nestjs/common` in services and repositories
- `logger.log()` for normal operations, `logger.warn()` for not-found, `logger.error()` for failures
- Never log passwords, tokens, or PII
- `redact` auth headers in the Pino config so they never appear in logs
- `console.log` is forbidden in committed code

---

## 19. Optional Integrations

These integrations are **not required** in every project. Enable only what the project needs. Each one lives in its own folder under `src/common/` and is imported into `AppModule` only when used.

### File Storage — AWS S3

```
src/common/aws/
├── aws.module.ts
└── aws.service.ts
```

- Wrap the S3 client in `AwsService` with typed methods: `uploadFile(buffer, key, mimeType)`, `deleteFile(key)`, `getSignedUrl(key)`
- Disable by simply not importing `AwsModule` into `AppModule` and removing its env keys
- When not using S3, store files locally via `multer.diskStorage` or use a different provider — just swap the service

### Email

```
src/common/email/
├── email.module.ts
├── email.service.ts
└── templates/
    └── *.html
```

- Wrap Nodemailer or Brevo in `EmailService` with named methods: `sendPasswordReset(to, token)`, `sendWelcome(to, name)`
- **Optional.** If the project does not use email, do not import `EmailModule`. Remove `SMTP_*` env keys from `.env.example`
- Never call the email service from a controller — only from a service, and only after the primary DB operation succeeds

### Queue — Bull + Redis

```
src/common/queue/
├── queue.module.ts
└── [feature]/
    ├── [feature].processor.ts
    └── [feature].producer.ts
```

- Use Bull queues for background jobs: email delivery, report generation, image processing
- **Optional.** If the project has no background jobs, skip Bull and Redis entirely
- Processors contain the job logic; producers add jobs to the queue from services

### OAuth — Google / Social Login

```
src/auth/strategies/
└── google.strategy.ts
```

- Implement as a Passport strategy, guard, and controller route
- **Optional.** If the project does not need social login, skip the OAuth strategy and remove its env keys

### Stripe / Payments

```
src/webhook/
src/checkout/
src/stripe-customer/
```

- Stripe webhook routes must preserve the raw request body — apply body-parser exclusion for `/webhook` in `main.ts`
- Never log or store Stripe secret keys
- **Optional.** Skip entirely for projects with no payment flows

---

## 20. Database Migrations

Never modify a production database by toggling `synchronize: true`. Always use migrations.

```typescript
// typeorm.config.ts — used by the TypeORM CLI
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST'),
  port: configService.get<number>('DB_PORT'),
  username: configService.get('DB_USERNAME'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_NAME'),
  entities: [__dirname + '/src/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,   // NEVER true in production
});
```

### One-time setup — required before the first migration

Postgres needs the `pgcrypto` extension enabled so `gen_random_uuid()` works for primary keys. Run this once against the target database:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Migration commands

```bash
# Generate a migration from entity changes
npx typeorm migration:generate migrations/AddUserAvatarColumn -d typeorm.config.ts

# Run pending migrations
npx typeorm migration:run -d typeorm.config.ts

# Revert the last migration
npx typeorm migration:revert -d typeorm.config.ts
```

### Migration rules

- `synchronize` is `false` everywhere — only `true` allowed in local dev if no migrations exist yet
- Migration file names are prefixed with a timestamp and describe the change: `1719475200000-AddUserAvatarColumn`
- Never edit an already-applied migration — create a new one
- Run migrations as part of deployment, before the app starts
- The `pgcrypto` extension migration (or a manual one-time `CREATE EXTENSION` step) must run before the very first entity migration in any new environment — without it, UUID primary key generation will fail
- Adding a new value to an existing Postgres `ENUM` type requires `ALTER TYPE [enum_name] ADD VALUE '[new_value]'` inside a migration — TypeORM's auto-generated migration handles this correctly when generated from an updated enum, but double-check the generated SQL before running it in production

---

## 21. Security Rules

- **Secrets** → only in `.env`, never in code or version control
- **Passwords** → always hashed with bcrypt before storage, `select: false` on the entity column
- **JWT** → short expiry on access tokens (15m), longer on refresh (7d), rotate refresh tokens on use
- **Input validation** → `ValidationPipe({ whitelist: true })` globally — unknown fields are stripped before they reach the service
- **SQL injection** → TypeORM parameterized queries only — never string-concatenate user input into queries
- **File uploads** → validate MIME type and file size before processing — never trust the `Content-Type` header alone
- **CORS** → explicit origin allowlist — never `origin: '*'` in production
- **Rate limiting** → apply `@nestjs/throttler` on auth endpoints at minimum
- **Helmet** → applied in `main.ts` globally
- **HPP** → applied in `main.ts` to block HTTP parameter pollution
- **Logging** → `redact` auth headers and body passwords in Pino config
- **Admin routes** → always behind both `JwtRoleGuard` and an explicit `@Roles(UserRoleEnum.ADMIN)` decorator

---

## 22. Comment Standard

### Rule: Comments explain WHY, not WHAT. Code explains what.

```typescript
// BAD — the code already says this
// Find the user by email
const user = await this.usersRepository.findOne({ email });

// GOOD — explains a non-obvious constraint
// Password column is select:false on the entity — use the custom repo method
// that explicitly selects it, not the standard findOne.
const user = await this.usersRepository.findByEmailWithPassword(email);
```

### File-level header template — every file gets one

```typescript
// ─────────────────────────────────────────────────────────────────────────────
// [FileName or ClassName]
// ─────────────────────────────────────────────────────────────────────────────
// One sentence: what this file does.
// One sentence (optional): any important constraint, dependency, or gotcha.
// ─────────────────────────────────────────────────────────────────────────────
```

### When to write a comment

| Situation | Comment? |
|---|---|
| File-level header | Always |
| Non-obvious business rule | Yes |
| Workaround for external API quirk | Yes |
| A `select: false` column needing explicit query | Yes |
| Transaction scope and why | Yes |
| Code that reads itself (`findOne`, `create`) | No |
| Obvious CRUD operations | No |

---

## 23. What is Forbidden

These rules apply to every file in the project with no exceptions.

| Forbidden | Correct approach |
|---|---|
| `process.env.SOMETHING` in service or controller code | Inject `ConfigService` and call `configService.get('KEY')` |
| `synchronize: true` in production | Use TypeORM migrations |
| `console.log(...)` in committed code | Use injected `Logger` from `@nestjs/common` |
| `throw new Error('...')` | Use NestJS HTTP exceptions (`NotFoundException`, etc.) |
| Business logic in a controller | Move to the service |
| DB queries in a controller | Go through the service → repository |
| One repository imported by two different feature services | Expose the data through the owning service and export that service |
| `type: any` | Use `unknown` + narrowing, or define the proper interface |
| Raw user-controlled strings in a TypeORM query | Use TypeORM parameterized binding — never string concatenation |
| Storing plain-text passwords | Always hash with bcrypt before `save()` |
| `CORS origin: '*'` in production | Explicit origin array in `enableCors` |
| `@ApiTags` missing from a controller | Every controller must have it |
| Optional integration imported unconditionally | Only import email/S3/queue modules when the project actually uses them |
| Entity `id`, `createdAt`, `updatedAt` defined manually | Extend `AbstractEntity` |
| DTO without `@ApiProperty` | Every DTO property needs Swagger annotation |
| Multiple entities defined in one file | One entity per file |
| Secrets committed to `.env` in git | `.env` is in `.gitignore`; use `.env.example` |
| `@Column({ type: 'json' })` for structured/flexible data | Use `@Column({ type: 'jsonb' })` — Postgres-only, indexable, faster |
| Auto-increment integer primary keys (`@PrimaryGeneratedColumn()`) | Use `@PrimaryGeneratedColumn('uuid')` |
| `ParseIntPipe` on a UUID route param | Use `ParseUUIDPipe` |
| Assuming `pgcrypto` is enabled by default | Explicitly run `CREATE EXTENSION IF NOT EXISTS pgcrypto;` once per database before the first migration |

---

> **Last updated:** June 2026
> **Applies to:** all NestJS / Node.js backend projects using PostgreSQL
> This blueprint is a living document — update it when a new pattern is adopted, not after the fact.