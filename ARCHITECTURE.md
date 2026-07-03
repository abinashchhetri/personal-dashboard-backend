# Sajilo Khata Backend — Architecture Reference

> **Stack:** NestJS 10 · TypeScript (strict) · TypeORM 0.3 · PostgreSQL · AWS S3 · yt-dlp · Last.fm API  
> **Base URL:** `http://localhost:4000/api/v1`  
> **Swagger:** `http://localhost:4000/api/docs` (disabled in production)

---

## Table of Contents

1. [Project Layout](#1-project-layout)
2. [Bootstrap & Global Middleware](#2-bootstrap--global-middleware)
3. [Module Dependency Graph](#3-module-dependency-graph)
4. [Database Layer](#4-database-layer)
5. [Auth Module](#5-auth-module)
6. [Users Module](#6-users-module)
7. [Accounts Module](#7-accounts-module)
8. [Categories Module](#8-categories-module)
9. [Transactions Module](#9-transactions-module)
10. [Transfers Module](#10-transfers-module)
11. [Investments Module](#11-investments-module)
12. [Analytics Module](#12-analytics-module)
13. [Music Module](#13-music-module)
14. [Playlists Module](#14-playlists-module)
15. [Common Infrastructure](#15-common-infrastructure)
16. [Cross-Cutting Patterns](#16-cross-cutting-patterns)
17. [Environment Variables](#17-environment-variables)
18. [Migrations](#18-migrations)
19. [API Route Reference](#19-api-route-reference)

---

## 1. Project Layout

```
src/
├── main.ts                        # Bootstrap, middleware, Swagger, startup checks
├── app.module.ts                  # Root module — imports all feature modules
├── app.controller.ts              # GET /health
│
├── common/
│   ├── aws/                       # AwsService — S3 upload/download/presign/stream
│   ├── database/                  # AbstractEntity, AbstractRepository, DatabaseModule
│   ├── decorators/                # @CurrentUser(), @Roles()
│   ├── dtos/                      # PaginationQueryDto
│   ├── filters/                   # HttpExceptionFilter
│   ├── helpers/                   # calculatePagination()
│   ├── interceptors/              # TransformInterceptor
│   ├── interfaces/                # IPayload, ISuccessResponse
│   └── ytdlp/                     # checkYtDlpInstalled(), buildSearchArgs(), parseDumpJsonOutput()
│
├── auth/                          # Google OAuth + JWT access/refresh
├── users/                         # User entity + repository
├── accounts/                      # Account CRUD + balance mutations
├── categories/                    # System + custom categories, auto-detection
├── transactions/                  # Expense/income/in-transit + line items
├── transfers/                     # Account-to-account transfers
├── investments/                   # NEPSE/SIP/FD portfolio tracker
├── analytics/                     # Dashboard, category breakdown, net worth
│
├── music/                         # yt-dlp pipeline, Last.fm recommendations, S3 audio cache
└── playlists/                     # User playlists with ordered tracks

migrations/                        # TypeORM migration files (one generated file covers all V2 tables)
typeorm.config.ts                  # CLI DataSource (synchronize: false always)
```

---

## 2. Bootstrap & Global Middleware

**File:** `src/main.ts`

| Layer | Detail |
|---|---|
| Framework | NestJS via `NestFactory.create(AppModule)` |
| Port | `PORT` env (default `4000`) |
| Global prefix | `api/v1` |
| Security headers | `helmet()`, `hpp()` |
| Cookie parsing | `cookie-parser` |
| Validation | `ValidationPipe({ whitelist: true, transform: true })` — strips unknown fields, coerces types |
| Response shape | `TransformInterceptor` — wraps all success responses in `{ success, message, data }` |
| Error shape | `HttpExceptionFilter` — standardises all error responses |
| Swagger | `/api/docs` (disabled when `NODE_ENV === 'production'`) |
| CORS | `CORS_ORIGIN` env (comma-separated), explicit allowlist, `credentials: true`, never wildcard |
| Startup seeds | `seedSystemCategories(DataSource)` — idempotent, runs every boot |
| Startup check | `checkYtDlpInstalled()` — logs `Logger.warn` if yt-dlp missing; **never crashes**; V1 finance still works |

---

## 3. Module Dependency Graph

```
AppModule
├── ConfigModule (global)
├── ThrottlerModule (global, 100 req/min default)
├── DatabaseModule
│   └── TypeOrmModule.forRootAsync (postgres, autoLoadEntities, synchronize off in prod)
│
├── UsersModule ──────────────────────────────────────────── exports UsersRepository
├── AuthModule (imports UsersModule, PassportModule, JwtModule) ─ exports JwtAuthGuard, JwtRoleGuard
│
├── AccountsModule ───────────────────────────────────────── exports AccountsService
├── CategoriesModule ─────────────────────────────────────── exports CategoriesService
│
├── TransactionsModule (imports AccountsModule, CategoriesModule)
├── TransfersModule    (imports AccountsModule)
├── InvestmentsModule ────────────────────────────────────── exports InvestmentsService
│
├── AnalyticsModule (imports TransactionsModule, AccountsModule, InvestmentsModule)
│
├── MusicModule
│   ├── ScheduleModule.forRoot() (cron jobs)
│   └── AwsModule
│       └── AwsService ──────────────────────────────────── (no exports, used via import)
│
└── PlaylistsModule
    └── (no MusicModule import — injects DataSource directly to avoid circular dep)
```

---

## 4. Database Layer

### `AbstractEntity<T>`

All entities extend this. Provides:

| Field | Type | Detail |
|---|---|---|
| `id` | `uuid` | `PrimaryGeneratedColumn('uuid')` |
| `createdAt` | `timestamptz` | `CreateDateColumn` |
| `updatedAt` | `timestamptz` | `UpdateDateColumn` + `@BeforeUpdate` sets `new Date()` |

### `AbstractRepository<T>`

All repositories extend this. Methods:

| Method | Behaviour |
|---|---|
| `create(entity)` | `entityManager.save(entity)` |
| `findOne(where)` | Returns entity or throws `NotFoundException` |
| `findOneAndUpdate(where, partial)` | `entityRepository.update(where, partial)`, throws if 0 rows affected |
| `find(where)` | `findBy(where)` |
| `findOneAndDelete(where)` | `entityRepository.delete(where)` |

> Repositories needing `null` instead of a throw add their own `findBy*` methods (e.g., `findByExternalId`).

### `DatabaseModule`

`TypeOrmModule.forRootAsync` — credentials from env, `autoLoadEntities: true`, `synchronize: NODE_ENV !== 'production'`.

---

## 5. Auth Module

### Strategy

Google OAuth 2.0 for initial login. JWTs in **httpOnly cookies** (not Authorization headers).

### Routes — prefix `/auth`

| Method | Path | Guard | Description |
|---|---|---|---|
| GET | `/auth/google` | `GoogleAuthGuard` | Redirects to Google consent screen |
| GET | `/auth/google/callback` | `GoogleAuthGuard` | Exchanges code, sets cookies, redirects to `${CORS_ORIGIN}/dashboard` |
| GET | `/auth/me` | `JwtAuthGuard` | Returns authenticated user profile |
| POST | `/auth/refresh` | `RefreshAuthGuard` | Rotates both tokens; old refresh token invalidated |
| POST | `/auth/logout` | `JwtAuthGuard` | Clears `access_token` + `refresh_token` cookies |

### Tokens

| Token | Cookie Name | Expiry | Secret env |
|---|---|---|---|
| Access | `access_token` | `JWT_ACCESS_EXPIRY` (default `15m`) | `JWT_ACCESS_SECRET` |
| Refresh | `refresh_token` | `JWT_REFRESH_EXPIRY` (default `7d`) | `JWT_REFRESH_SECRET` |

Both cookies: `httpOnly: true`, `secure` in production, `sameSite: 'lax'`.

### Guards

| Guard | Strategy | Use |
|---|---|---|
| `JwtAuthGuard` | `jwt` — reads `access_token` cookie | Standard authenticated routes |
| `RefreshAuthGuard` | `jwt-refresh` — reads `refresh_token` cookie | `/auth/refresh` only |
| `GoogleAuthGuard` | `google` — passport-google-oauth20 | OAuth initiation + callback |
| `JwtRoleGuard` | `jwt` + `Reflector` reads `@Roles()` | Admin-gated routes |

### `IPayload` (JWT subject)

```typescript
interface IPayload { id: string; email: string; role?: string; }
```

---

## 6. Users Module

### `User` entity — table `users`

| Column | Type | Constraints |
|---|---|---|
| `googleId` | varchar | UNIQUE |
| `name` | varchar | NOT NULL |
| `email` | varchar | UNIQUE |
| `avatarUrl` | varchar | nullable |
| `role` | enum | `USER` \| `ADMIN`, default `USER` |

### Repository methods

- `findByGoogleId(googleId)` → `User | null`
- `createFromGoogleProfile(profile)` → `User`

> `UsersModule` exports `UsersRepository` for `AuthModule` only. No HTTP controller — user data accessed via `GET /auth/me`.

---

## 7. Accounts Module

### `Account` entity — table `accounts`

| Column | Type | Notes |
|---|---|---|
| `userId` | uuid | @Index, FK → users |
| `type` | enum | `CASH \| BANK \| ESEWA \| KHALTI` |
| `name` | varchar | |
| `currentBalance` | decimal(14,2) | String→number transformer |
| `initialBalance` | decimal(14,2) | String→number transformer |
| `isDefault` | boolean | default false |
| `isArchived` | boolean | default false |

### Routes — prefix `/accounts`

All routes require `JwtAuthGuard`. `userId` always from JWT, never from request.

| Method | Path | Description |
|---|---|---|
| POST | `/accounts` | Create account; if `isDefault: true` → QueryRunner atomically unsets old default |
| GET | `/accounts` | Paginated list; filters: `type`, `includeArchived` |
| GET | `/accounts/:id` | Single account (ownership scoped) |
| PATCH | `/accounts/:id` | Update; default-swap in QueryRunner if `isDefault` changes |
| DELETE | `/accounts/:id` | Delete |

### Key service behaviours

- **Atomic balance mutations:** `incrementBalance` and `decrementBalance` use SQL arithmetic (`SET currentBalance = currentBalance + :amount`) — never read-then-write.
- **Default swap:** Setting an account as default wraps the old-default unset and new-default set in a single `QueryRunner` transaction.

---

## 8. Categories Module

### `Category` entity — table `categories`

| Column | Type | Notes |
|---|---|---|
| `userId` | uuid | nullable, @Index — NULL = system category |
| `name` | varchar | |
| `icon` | varchar | nullable |
| `color` | varchar | nullable |
| `keywords` | jsonb | default `[]` |
| `isCustom` | boolean | default false |
| `isSystem` | boolean | default false |

### Routes — prefix `/categories`

| Method | Path | Description |
|---|---|---|
| POST | `/categories` | Create custom category |
| GET | `/categories` | System categories + user's custom (system first, then alpha) |
| GET | `/categories/:id` | Single |
| PATCH | `/categories/:id` | Update custom only; system categories throw `ForbiddenException` |
| DELETE | `/categories/:id` | Delete custom only |

### Auto-detection

`detectCategory(itemName, userId)` — JSONB keyword lateral query: checks if any keyword in `categories.keywords` matches (ILIKE) the item name. Falls back to the system "Miscellaneous" category.

### System Categories (seeded on boot)

| Name | Sample Keywords |
|---|---|
| Food & Groceries | dal, rice, milk, egg, oil, sabji |
| Dining Out | restaurant, cafe, momo, chowmein |
| Transport | bus, taxi, fuel, uber, pathao |
| Utilities | electricity, internet, water bill, phone bill |
| Health | medicine, doctor, pharmacy, hospital |
| Entertainment | movie, netflix, spotify, game |
| Shopping | clothes, shoes, bag, cosmetics |
| Miscellaneous | *(catch-all, no keywords)* |

---

## 9. Transactions Module

### Entities

#### `Transaction` — table `transactions`

| Column | Type | Notes |
|---|---|---|
| `userId` | uuid | @Index |
| `accountId` | uuid | @Index, FK → accounts CASCADE |
| `categoryId` | uuid | nullable, FK → categories SET NULL |
| `type` | enum | `expense \| income \| in_transit` |
| `totalAmount` | decimal(14,2) | = sum of line items for expense/income |
| `isPersonal` | boolean | default true |
| `voiceTranscript` | text | nullable |
| `note` | text | nullable |
| `entryMethod` | varchar | `'form'` or `'voice'` |
| `transactedAt` | timestamptz | default NOW() |
| `lineItems` | OneToMany | cascade |

#### `LineItem` — table `line_items`

| Column | Type | Notes |
|---|---|---|
| `transactionId` | uuid | @Index, FK → transactions CASCADE |
| `categoryId` | uuid | nullable, FK → categories SET NULL |
| `name` | varchar | |
| `amount` | decimal(14,2) | |

### Routes — prefix `/transactions`

| Method | Path | Description |
|---|---|---|
| POST | `/transactions` | Create expense/income (requires lineItems) or in_transit (requires totalAmount) |
| GET | `/transactions` | Paginated; filters: accountId, type, categoryId, isPersonal, startDate, endDate |
| GET | `/transactions/:id` | With line items + category |
| PATCH | `/transactions/:id` | Update `note` and `categoryId` only |
| DELETE | `/transactions/:id` | Delete + reverse balance |

### Create flow (QueryRunner)

1. Validate: `expense`/`income` require `lineItems`; `in_transit` requires `totalAmount`
2. Verify account ownership
3. Auto-categorise each line item via `CategoriesService.detectCategory`
4. `totalAmount = Σ lineItems.amount` (expense/income)
5. `categoryId` = modal category among line items (`pickModeCategory`)
6. **QueryRunner:** save Transaction (cascades LineItems) → atomically adjust balance (`expense` → decrement, `income` → increment)

### Delete flow (QueryRunner)

Reverses balance change (`expense` → increment, `income` → decrement) then deletes (cascades LineItems).

---

## 10. Transfers Module

### `Transfer` entity — table `transfers`

| Column | Type | Notes |
|---|---|---|
| `userId` | uuid | @Index |
| `fromAccountId` | uuid | @Index, FK → accounts CASCADE |
| `toAccountId` | uuid | @Index, FK → accounts CASCADE |
| `amount` | decimal(14,2) | |
| `note` | text | nullable |
| `transactedAt` | timestamptz | default NOW() |

### Routes — prefix `/transfers`

| Method | Path | Description |
|---|---|---|
| POST | `/transfers` | Create; validates from ≠ to; QueryRunner: decrement source + increment destination |
| GET | `/transfers` | Paginated; filter by accountId (matches either side), startDate, endDate |
| GET | `/transfers/:id` | Single with fromAccount + toAccount |
| DELETE | `/transfers/:id` | Reverses both balance changes then deletes |

---

## 11. Investments Module

### Entities

#### `Investment` — table `investments`

| Column | Type | Notes |
|---|---|---|
| `userId` | uuid | @Index |
| `type` | enum | `nepse \| sip \| fd` |
| `name` | varchar | |
| `investedAmount` | decimal(14,2) | |
| `currentValue` | decimal(14,2) | nullable |
| `metadata` | jsonb | broker, quantity, buy price (NEPSE) |
| `isActive` | boolean | default true |
| `startedAt` | timestamptz | nullable |

#### `InvestmentHistory` — table `investment_history`

Snapshot of `currentValue` at a point in time. Created whenever `currentValue` changes on PATCH.

| Column | Type |
|---|---|
| `investmentId` | uuid |
| `valueSnapshot` | decimal(14,2) |
| `recordedAt` | timestamptz |

#### `InvestmentTransaction` — table `investment_transactions`

NEPSE BUY/SELL records used for WAC calculation.

| Column | Type | Notes |
|---|---|---|
| `investmentId` | uuid | |
| `transactionType` | enum | `buy \| sell` |
| `quantity` | decimal(14,4) | fractional units |
| `pricePerUnit` | decimal(14,2) | |
| `transactionDate` | timestamptz | |
| `brokerageFee` | decimal(14,2) | nullable |
| `realizedGainLoss` | decimal(14,2) | nullable; SELL rows only |
| `note` | varchar | nullable |

### Routes — prefix `/investments`

| Method | Path | Description |
|---|---|---|
| POST | `/investments` | Create investment |
| GET | `/investments` | Paginated; filters: type, isActive |
| GET | `/investments/summary` | Portfolio summary (declared before `:id` — route order) |
| GET | `/investments/:id` | Enriched with unrealizedGainLoss, WAC, remainingQuantity |
| PATCH | `/investments/:id` | Update; if currentValue changes → QueryRunner snapshots old value first |
| DELETE | `/investments/:id` | Delete (cascades history + transactions) |
| POST | `/investments/:id/transactions` | Record BUY/SELL (NEPSE only) |
| GET | `/investments/:id/transactions` | Paginated transaction history |

### NEPSE Enrichment

`EnrichedInvestment` computed fields:

| Field | Computation |
|---|---|
| `remainingQuantity` | `SUM(CASE buy → +qty, sell → -qty)` |
| `averageBuyPrice` | WAC: `SUM(qty × price + fee) / SUM(qty)` on BUY rows |
| `unrealizedGainLoss` | `(currentValue - investedAmount)` |
| `totalRealizedGainLoss` | `SUM(realizedGainLoss)` on SELL rows |

**SELL validation:** Checks remaining quantity before allowing a sell. Sets `isActive = false` if remaining quantity ≤ 0 after the sell.

**Portfolio summary** (`GET /investments/summary`): `{ totalInvested, totalCurrentValue, totalGainLoss, totalGainLossPercent, totalRealizedGainLoss, totalUnrealizedGainLoss, byType: { nepse, sip, fd } }`

---

## 12. Analytics Module

Read-only aggregate queries. No writes. All routes require `JwtAuthGuard`.

### Routes — prefix `/analytics`

| Method | Path | Query | Description |
|---|---|---|---|
| GET | `/analytics/dashboard` | `startDate`, `endDate` | `{ totalSpent, totalIncome, netSavings, savingsRate }` |
| GET | `/analytics/categories` | `startDate`, `endDate` | Expense breakdown by category with percentage |
| GET | `/analytics/accounts` | `startDate`, `endDate` | Per-account balance + period spend + txn count |
| GET | `/analytics/top-items` | `startDate`, `endDate`, `limit` (max 100) | Top N line item names by total spend |
| GET | `/analytics/item-trend` | `startDate`, `endDate`, `itemName` | Monthly spend for named item `[{ month: 'YYYY-MM', total }]` |
| GET | `/analytics/net-worth` | — | `{ totalBalance, totalInvestmentValue, netWorth }` |

**Date range default:** Current calendar month (start = first of month, end = today).

**Dashboard query pattern:** Single `CASE WHEN` SQL aggregation over `transactions` filtered to `isPersonal = true`.

---

## 13. Music Module

Full audio pipeline: discovery → download → S3 cache → stream.

### Architecture Overview

```
GET /music/find?q=     →  YtDlpProvider.searchTracks()  →  IDiscoveryTrack[]
POST /music/play-discovery  →  TracksRepository.findOrCreate()
                            →  TrackCacheService.ensureCached()  [fire-and-forget]
                            →  returns { track, streamUrl: null, caching: true }
POST /music/play/:id   →  TrackCacheService.ensureCached()  [fire-and-forget if not cached]
                       →  AwsService.getPresignedUrl()
POST /music/prepare-next → RecommendationsService.prepareNextTrack()  [AWAITED ~30s early]
GET /music/next/:id    → RecommendationsService.getNextTrack()  [instant, no download]
GET /music/stream/:id  → AwsService.getStreamRange()  [byte-range, S3 URL never exposed]
```

### Entities

#### `Track` — table `tracks`

| Column | Type | Notes |
|---|---|---|
| `externalId` | varchar | YouTube video ID, @Index |
| `title` | varchar | |
| `artist` | varchar | |
| `album` | varchar | nullable |
| `duration` | integer | nullable; set after yt-dlp download |
| `s3Key` | varchar | nullable; `music/tracks/{id}.mp3` |
| `coverUrl` | varchar | nullable |
| `bitrate` | integer | default 320 |
| `source` | enum | `YOUTUBE` |
| `isCached` | boolean | default false; **only true after S3 upload confirms** |
| `playCount` | integer | default 0 |
| `lastPlayedAt` | timestamptz | nullable |
| `fileSizeBytes` | bigint | nullable; bigint→number transformer |
| `metadata` | jsonb | default `{}` |

#### `RecommendationCache` — table `recommendation_cache`

Unique constraint: `(sourceTrackId, recommendedExternalId)`.

| Column | Type | Notes |
|---|---|---|
| `sourceTrackId` | uuid | Not a FK — source may not be in DB yet |
| `sourceExternalId` | varchar | YouTube ID of source track |
| `recommendedExternalId` | varchar | Starts as `lastfm:{artist}:{title}` placeholder; overwritten with real YouTube ID by `prepareNextTrack` |
| `recommendedTitle` | varchar | |
| `recommendedArtist` | varchar | |
| `recommendedCoverUrl` | varchar | nullable |
| `matchScore` | decimal(5,4) | Last.fm similarity (0–1) |
| `apiSource` | varchar | default `'lastfm'` |
| `isPrepared` | boolean | false → yt-dlp resolved + S3 cached → true |
| `cachedAt` | timestamptz | default NOW() |

#### `UserMusicPreference` — table `user_music_preferences`

| Column | Type |
|---|---|
| `userId` | uuid (UNIQUE) |
| `seedArtists` | jsonb (default `[]`) |
| `seedGenres` | jsonb (default `[]`) |
| `preferredBitrate` | integer (default 320) |

### Routes — prefix `/music`

Static routes declared before param routes (prevents NestJS param collision).

| Method | Path | Rate Limit | Description |
|---|---|---|---|
| GET | `/music/search` | 100/min | Search **cached** tracks by title/artist ILIKE |
| GET | `/music/history` | 100/min | Cached tracks ordered by `lastPlayedAt DESC` |
| GET | `/music/find` | 100/min | **Live YouTube search** via yt-dlp — `?q` required, min 2 chars |
| GET | `/music/presigned/:trackId` | 60/min | Pre-signed S3 URL (1 hr expiry) |
| GET | `/music/stream/:trackId` | 60/min | Byte-range audio stream proxied through server (`@Res({ passthrough: false })`) |
| GET | `/music/next/:currentTrackId` | 100/min | Instant: return already-prepared next track |
| GET | `/music/recommendations/:trackId` | 100/min | Raw `RecommendationCache` rows for a track |
| POST | `/music/play-discovery` | 30/min | Play by `externalId`; `findOrCreate` stub; fires `ensureCached` |
| POST | `/music/play/:trackId` | 30/min | Play by DB `id`; fires `incrementPlayCount` + `fetchAndStoreRecommendations` |
| POST | `/music/prepare-next` | 10/min | **Awaited** — resolves + caches next track; call ~30s before current track ends |

### Services

#### `TrackCacheService`

The only public entry point for audio caching. Call `ensureCached()` — never `cacheTrack()` directly.

```
ensureCached(externalId, title, artist, coverUrl?)
  └─ checkLocalCache()           → hit: return immediately
  └─ cacheTrack()
       ├─ QueryRunner.start
       ├─ find or create Track stub (isCached: false)
       ├─ QueryRunner.COMMIT          ← commits BEFORE download
       ├─ YtDlpProvider.downloadTrack() [120s timeout, outside transaction]
       ├─ AwsService.uploadFile()     [metadata sanitised to ASCII]
       └─ findOneAndUpdate(isCached: true, s3Key, duration, fileSizeBytes)
```

> **Design invariant:** The DB transaction is committed before yt-dlp runs. A 90-second download must never hold a DB row lock. The `isCached: false` stub is an application-level "in progress" flag; concurrent callers see it and short-circuit.

#### `RecommendationsService`

| Method | Called from | Blocking? |
|---|---|---|
| `fetchAndStoreRecommendations(trackId, artist, title)` | `POST /music/play` | **Fire-and-forget** (`void`) |
| `prepareNextTrack(sourceTrackId)` | `POST /music/prepare-next` | **Awaited** (up to ~30s) |
| `getNextTrack(sourceTrackId)` | `GET /music/next/:id` | Instant (DB only) |
| `getRawRecommendations(sourceTrackId)` | `GET /music/recommendations/:id` | Instant (DB only) |
| `cleanOldRecommendations()` | `MusicCleanupTask` (3 AM cron) | Awaited |

`prepareNextTrack` retries once on yt-dlp failure. `recommendedExternalId` placeholder (`lastfm:{artist}:{title}`) is overwritten with the real YouTube ID via `findOneAndUpdate`.

#### `LastFmService`

- Uses built-in `fetch` with `AbortController` (5s timeout)
- `clearTimeout()` called immediately after `await fetch()` — before JSON parsing
- Checks `json['error']` not HTTP status (Last.fm returns HTTP 200 for errors)
- Returns `[]` on: missing API key, timeout, HTTP error, JSON parse error, Last.fm error field

#### `YtDlpProvider`

All subprocess calls use `spawn()` not `exec()` — prevents shell injection.

| Method | Args | Timeout | Returns |
|---|---|---|---|
| `searchTrack(title, artist)` | `ytsearch1:`, `--dump-json --no-download` | 30s | `IExternalTrackResult \| null` |
| `searchTracks(query, limit=8)` | `ytsearch{N}:`, `--dump-json --flat-playlist` | 30s | `IExternalTrackResult[]` |
| `downloadTrack(externalId, title, artist)` | direct ID, `-x --audio-format mp3` | 120s | `{ buffer, durationSeconds, fileSizeBytes }` |

`searchTracks` parses stdout line-by-line (yt-dlp emits one JSON object per line for multi-result). Any unparseable line is silently dropped. Returns `[]` on any failure.

### Cron Task

`MusicCleanupTask` — `@Cron('0 3 * * *')` (daily at 3 AM):
1. `cleanOldRecommendations()` — deletes `RecommendationCache` rows older than 7 days
2. `cleanupTempFiles()` — deletes `.mp3` files older than 1 hour from `YTDLP_TEMP_DIR`

Entire cron body is wrapped in try/catch — errors are logged, never rethrown.

### Stream Route Design

`GET /music/stream/:trackId` uses `@Res({ passthrough: false })` — this prevents `TransformInterceptor` from attempting to wrap the raw audio stream in `{ success: true, data: ... }`, which would corrupt binary data. The S3 presigned URL is never exposed to the client; all audio flows through the server proxy.

---

## 14. Playlists Module

### Entities

#### `Playlist` — table `playlists`

| Column | Type | Notes |
|---|---|---|
| `userId` | uuid | @Index, FK → users CASCADE |
| `name` | varchar | |
| `description` | varchar | nullable |
| `coverUrl` | varchar | nullable |
| `isActive` | boolean | default true |
| `trackCount` | integer | **Denormalised counter** — kept in sync inside QueryRunner with every add/remove |

#### `PlaylistTrack` — table `playlist_tracks`

Unique: `(playlistId, trackId)` and `(playlistId, position)`. Index on `(playlistId, position)`.

| Column | Type | Notes |
|---|---|---|
| `playlistId` | uuid | FK → playlists CASCADE |
| `trackId` | uuid | FK → tracks CASCADE |
| `position` | integer | 0-indexed, no gaps — always contiguous |
| `addedAt` | timestamptz | default NOW() |

### Routes — prefix `/playlists`

> **Route order:** `PATCH /:id/tracks/reorder` is declared before `DELETE /:id/tracks/:trackId` to prevent NestJS treating literal `reorder` as a `:trackId` UUID.

| Method | Path | Description |
|---|---|---|
| POST | `/playlists` | Create playlist |
| GET | `/playlists` | All user playlists |
| GET | `/playlists/:id` | With ordered tracks |
| PATCH | `/playlists/:id` | Update name/description/cover |
| DELETE | `/playlists/:id` | Delete playlist |
| POST | `/playlists/:id/tracks` | Add track (must be `isCached = true`); position optional (appends) |
| PATCH | `/playlists/:id/tracks/reorder` | Move track to new position |
| DELETE | `/playlists/:id/tracks/:trackId` | Remove track + close position gap |

### `addTrack` (QueryRunner)

1. Verify playlist ownership
2. Verify `track.isCached = true` — `BadRequestException` if not cached
3. Reject duplicate `(playlistId, trackId)`
4. Determine position (explicit or `MAX(position) + 1`)
5. Insert `PlaylistTrack`
6. `trackCount = trackCount + 1` — **same transaction**

### `reorderTrack` (QueryRunner)

- Forward (newPos > current): `shiftPositionsDown([current+1, newPos], -1)` → set position
- Backward (newPos < current): `shiftPositionsUp([newPos, current-1], +1)` → set position
- No-op if `newPos === current` — commits and returns immediately

### `removeTrack` (QueryRunner)

1. Delete junction row
2. `reorderAfterRemoval` — shifts all positions above removed slot down by 1
3. `trackCount = trackCount - 1` — **same transaction**

> `PlaylistsService` queries `Track` via `DataSource` (injected with `@InjectDataSource()`) instead of importing `MusicModule` — avoids a circular module dependency.

---

## 15. Common Infrastructure

### `AwsService`

| Method | Description |
|---|---|
| `uploadFile(buffer, key, mimeType, metadata?)` | `PutObjectCommand`, `StorageClass: 'STANDARD'` |
| `getPresignedUrl(key, expiresInSeconds?)` | `GetObjectCommand` signed URL |
| `getStreamRange(key, rangeHeader, res: ServerResponse)` | Byte-range proxy; 206 with `Content-Range` or 200; S3 body piped directly |
| `fileExists(key)` | `HeadObjectCommand`; returns false on 404/NotFound, never throws |
| `deleteFile(key)` | Idempotent |
| `getFileSizeBytes(key)` | 0 if not found |
| `buildMusicKey(trackId, format='mp3')` | `music/tracks/{trackId}.mp3` — **only place to construct this path** |

### `TransformInterceptor`

Wraps all non-streaming responses:
```json
{ "success": true, "message": "Success", "data": { ... } }
```
Skipped for streaming routes via `@Res({ passthrough: false })`.

### `HttpExceptionFilter`

All error responses:
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Track not found",
  "errors": ["..."] ,
  "timestamp": "2026-07-03T16:00:00.000Z",
  "path": "/api/v1/music/play/abc"
}
```

### `PaginationQueryDto`

| Field | Default | Validators |
|---|---|---|
| `page` | 1 | `@IsInt @Min(1) @IsOptional @Type(Number)` |
| `limit` | 10 | `@IsInt @Min(1) @Max(100) @IsOptional @Type(Number)` |

Standard paginated response: `{ data[], total, page, limit, totalPages, hasNextPage, hasPrevPage }`

### `ytdlp.utils.ts`

Pure functions, no DI:
- `checkYtDlpInstalled()` — runs `yt-dlp --version` via `execAsync`; returns boolean
- `buildSearchArgs(artist, title, outputPath)` → `string[]` for `spawn()`
- `buildDumpJsonArgs(artist, title)` → `string[]` for metadata-only fetch
- `parseDumpJsonOutput(stdout)` → `YtDlpTrackMeta | null`

---

## 16. Cross-Cutting Patterns

### Auth Scoping

Every feature route derives `userId` from `@CurrentUser()` (JWT payload). It is **never** taken from request body or URL params. Ownership checks like `findOneForUser(id, userId)` return `null` (not `NotFoundException`) to avoid leaking whether another user's resource ID exists.

### Transaction Safety

All operations that touch multiple tables or perform balance mutations use `DataSource.createQueryRunner()`:

```typescript
const qr = this.dataSource.createQueryRunner();
await qr.connect();
await qr.startTransaction();
try {
  // ... operations via qr.manager ...
  await qr.commitTransaction();
} catch (err) {
  await qr.rollbackTransaction();
  throw err;
} finally {
  await qr.release(); // always
}
```

Long I/O (yt-dlp downloads, external HTTP) is **never** performed inside a transaction.

### Atomic Counters

SQL arithmetic updates prevent read-modify-write races:
```typescript
.set({ balance: () => '"currentBalance" + :amount' })
.set({ trackCount: () => '"trackCount" + 1' })
.set({ playCount: () => '"playCount" + 1' })
```

### Fire-and-Forget

Non-blocking background work uses `void`:
```typescript
void this.trackCacheService.ensureCached(...);          // audio download
void this.tracksRepository.incrementPlayCount(id);      // DB write
void this.recommendationsService.fetchAndStoreRecommendations(...); // Last.fm
```
These never block the HTTP response.

### NestJS Route Ordering

Static path segments **must** be declared before param segments:
- `GET /music/find` before `GET /music/presigned/:trackId`
- `PATCH /playlists/:id/tracks/reorder` before `DELETE /playlists/:id/tracks/:trackId`
- `GET /investments/summary` before `GET /investments/:id`

### S3 Metadata Sanitisation

S3 metadata travels as HTTP headers. Non-ASCII characters in artist/title (Unicode, Nepali script, emoji) cause `ERR_INVALID_CHAR`. All metadata values are stripped to printable ASCII before upload:
```typescript
const ascii = (s: string) => s.replace(/[^\x20-\x7E]/g, '').trim() || 'Unknown';
```

---

## 17. Environment Variables

```bash
# ─── App ──────────────────────────────────────────────────────────────────────
NODE_ENV=
PORT=4000
CORS_ORIGIN=http://localhost:3000

# ─── Database ─────────────────────────────────────────────────────────────────
DB_HOST=
DB_PORT=5432
DB_USERNAME=
DB_PASSWORD=
DB_NAME=

# ─── Auth ─────────────────────────────────────────────────────────────────────
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ─── Google OAuth ─────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4000/api/v1/auth/google/callback

# ─── AWS S3 ───────────────────────────────────────────────────────────────────
AWS_ACCESS_KEY=
AWS_SECRET_KEY=
AWS_S3_BUCKET=
AWS_REGION=
AWS_S3_PRESIGNED_URL_EXPIRY=3600

# ─── yt-dlp ───────────────────────────────────────────────────────────────────
YTDLP_PATH=yt-dlp
YTDLP_TEMP_DIR=/tmp/sajilo-khata-audio

# ─── Last.fm ──────────────────────────────────────────────────────────────────
LASTFM_API_KEY=
LASTFM_BASE_URL=https://ws.audioscrobbler.com/2.0
```

---

## 18. Migrations

One generated file covers all V2 (Music + Playlists) tables in correct FK dependency order:

```
migrations/1783066631447-CreateTracksTable.ts
```

Tables created in order:
1. `tracks` — no FKs
2. `user_music_preferences` — no FKs
3. `recommendation_cache` — no FKs (`sourceTrackId` is intentionally not a FK)
4. `playlists` — FK → `users`
5. `playlist_tracks` — FK → `playlists` and → `tracks`

### Commands

```bash
# Apply all pending migrations
npm run migration:run

# Generate a new migration after entity changes
npm run migration:generate -- migrations/SomeName

# Revert the last applied migration
npm run migration:revert

# Verify tables exist
psql -d your_db_name -c "\dt"
```

> `npm run migration:*` wraps `typeorm-ts-node-commonjs` — handles TypeScript + path aliases without a separate compile step.

---

## 19. API Route Reference

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | `{ status: 'ok', timestamp }` |

### Auth

| Method | Path | Auth |
|---|---|---|
| GET | `/auth/google` | None |
| GET | `/auth/google/callback` | Google |
| GET | `/auth/me` | JWT cookie |
| POST | `/auth/refresh` | Refresh cookie |
| POST | `/auth/logout` | JWT cookie |

### Accounts

| Method | Path |
|---|---|
| POST | `/accounts` |
| GET | `/accounts?type=&includeArchived=` |
| GET | `/accounts/:id` |
| PATCH | `/accounts/:id` |
| DELETE | `/accounts/:id` |

### Categories

| Method | Path |
|---|---|
| POST | `/categories` |
| GET | `/categories` |
| GET | `/categories/:id` |
| PATCH | `/categories/:id` |
| DELETE | `/categories/:id` |

### Transactions

| Method | Path |
|---|---|
| POST | `/transactions` |
| GET | `/transactions?accountId=&type=&categoryId=&isPersonal=&startDate=&endDate=` |
| GET | `/transactions/:id` |
| PATCH | `/transactions/:id` |
| DELETE | `/transactions/:id` |

### Transfers

| Method | Path |
|---|---|
| POST | `/transfers` |
| GET | `/transfers?accountId=&startDate=&endDate=` |
| GET | `/transfers/:id` |
| DELETE | `/transfers/:id` |

### Investments

| Method | Path |
|---|---|
| POST | `/investments` |
| GET | `/investments?type=&isActive=` |
| GET | `/investments/summary` |
| GET | `/investments/:id` |
| PATCH | `/investments/:id` |
| DELETE | `/investments/:id` |
| POST | `/investments/:id/transactions` |
| GET | `/investments/:id/transactions` |

### Analytics

| Method | Path |
|---|---|
| GET | `/analytics/dashboard?startDate=&endDate=` |
| GET | `/analytics/categories?startDate=&endDate=` |
| GET | `/analytics/accounts?startDate=&endDate=` |
| GET | `/analytics/top-items?startDate=&endDate=&limit=` |
| GET | `/analytics/item-trend?startDate=&endDate=&itemName=` |
| GET | `/analytics/net-worth` |

### Music

| Method | Path | Notes |
|---|---|---|
| GET | `/music/search?q=&page=&limit=` | Cached tracks only |
| GET | `/music/history?page=&limit=` | Cached tracks by lastPlayedAt |
| GET | `/music/find?q=` | Live YouTube search; q required, min 2 chars |
| GET | `/music/presigned/:trackId` | 60/min rate limit |
| GET | `/music/stream/:trackId` | Byte-range proxy; 60/min |
| GET | `/music/next/:currentTrackId` | Instant — no download |
| GET | `/music/recommendations/:trackId` | Raw recommendation rows |
| POST | `/music/play-discovery` | Body: `{ externalId, title, artist, coverUrl? }` |
| POST | `/music/play/:trackId` | 30/min |
| POST | `/music/prepare-next` | Body: `{ currentTrackId }`; 10/min |

### Playlists

| Method | Path |
|---|---|
| POST | `/playlists` |
| GET | `/playlists` |
| GET | `/playlists/:id` |
| PATCH | `/playlists/:id` |
| DELETE | `/playlists/:id` |
| POST | `/playlists/:id/tracks` |
| PATCH | `/playlists/:id/tracks/reorder` |
| DELETE | `/playlists/:id/tracks/:trackId` |

---

*Generated from codebase analysis — `src/` as of 2026-07-04*
