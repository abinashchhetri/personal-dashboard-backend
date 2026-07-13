# Sajilo Khata Backend

> A comprehensive personal finance, fitness, and investment tracking platform with integrated Solana blockchain payments and AI-powered personalized fitness planning.

**Status:** Production Ready | **License:** Private | **Author:** Abinash Chhetri

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green)](https://nodejs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-red)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791)](https://www.postgresql.org/)
[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF)](https://solana.com/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Server](#running-the-server)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Payment Protocols](#payment-protocols)
- [Database](#database)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

**Sajilo Khata** (सजिलो खाता) is a comprehensive personal finance and wellness management platform. It provides users with a unified dashboard to manage their complete financial life—tracking accounts, transactions, budgets, and investments—while simultaneously monitoring fitness progress through workout and meal logging.

The platform uniquely integrates blockchain-powered payments to monetize premium features:

1. **Solana Pay** — Users can receive USDC payments directly into their accounts via QR codes (verified on-chain)
2. **x402 Protocol** — Users pay just 0.01 USDC to receive AI-generated personalized 7-day fitness + meal plans powered by Gemini AI

All transactions are transparent, verified on the Solana devnet blockchain, and viewable on Solana Explorer. The backend is production-ready, fully typed, and optimized for performance.

---

## ✨ Features

### Finance Management
- ✅ **Account Management** — Create and manage multiple bank/wallet accounts
- ✅ **Transaction Tracking** — Log income, expenses, transfers with categorization
- ✅ **Budget Planning** — Set and monitor spending limits by category
- ✅ **Investment Tracking** — Track crypto, stocks, real estate with performance metrics
- ✅ **Analytics Dashboard** — Visualize spending, net worth, trends, and insights
- ✅ **Multi-Currency Support** — Handle NPR, USD, and crypto assets

### Fitness & Nutrition
- ✅ **Workout Plans** — Import, track, and log strength training sessions
- ✅ **Meal Planning** — Plan meals and log daily nutrition intake
- ✅ **Progress Analytics** — Track exercise progression, adherence, and body composition
- ✅ **Macro Tracking** — Monitor protein, carbs, fats with daily targets

### Blockchain Integration
- ✅ **Solana Pay QR Codes** — Generate SPL token transfer requests (USDC)
- ✅ **Payment Verification** — On-chain validation of Solana transactions
- ✅ **x402 Payment Protocol** — HTTP 402-based gating for premium features
- ✅ **AI Plan Generation** — Gemini-powered personalized fitness plans (requires payment)

### Security & Auth
- ✅ **Google OAuth 2.0** — Secure login via Google accounts
- ✅ **JWT Authentication** — Access tokens + refresh token rotation
- ✅ **CORS Protection** — Explicit origin allowlist (no wildcard)
- ✅ **Rate Limiting** — Global throttling (100 req/min)
- ✅ **Helmet Security** — XSS, CSRF, clickjacking protection

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js 18+ |
| **Framework** | NestJS 10.x |
| **Language** | TypeScript 5.x |
| **Database** | PostgreSQL 14+ |
| **ORM** | TypeORM 0.3.x |
| **Authentication** | Passport.js + JWT |
| **Blockchain** | Solana Web3.js, @solana/pay |
| **AI** | Google Generative AI (Gemini) |
| **Validation** | class-validator, class-transformer |
| **Logging** | Pino (structured JSON logs) |
| **Documentation** | Swagger/OpenAPI |
| **Testing** | Jest, Supertest |

---

## 📦 Prerequisites

Before you begin, ensure you have installed:

```bash
# Required
- Node.js v18.x or higher
- npm v9.x or higher
- PostgreSQL v14 or higher

# Optional (for music features)
- yt-dlp (audio extraction)
- ffmpeg (audio processing)
```

### Check versions
```bash
node --version    # v18.x+
npm --version     # v9.x+
psql --version    # PostgreSQL 14+
```

---

## 💻 Installation

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/sajilo-khata.git
cd sajilo-khata/sajilo-khata-backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create database
```bash
# Create PostgreSQL database (replace username/password as needed)
createdb sajilo_khata
```

### 4. Set up environment variables
```bash
# Copy example to .env
cp .env.example .env

# Edit .env with your values (see Configuration section below)
nano .env
```

### 5. Run migrations
```bash
npm run migration:run
```

### 6. Start the server
```bash
# Development (with hot reload)
npm run start:dev

# Production
npm run start:prod
```

The API will be available at `http://localhost:4000/api/v1`

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

#### App Configuration
```env
NODE_ENV=development
PORT=4000
PREFIX=/api/v1
```

#### CORS & Frontend
```env
CORS_ORIGIN=https://dashboard.abinashchhetri.com.np,http://localhost:3000
FRONTEND_URL=https://dashboard.abinashchhetri.com.np
```

#### Database (PostgreSQL)
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_secure_password
DB_NAME=sajilo_khata
```

#### JWT Authentication
```env
JWT_ACCESS_SECRET=your_secret_key_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_key_min_32_chars
JWT_ACCESS_EXPIRY=1hr
JWT_REFRESH_EXPIRY=7d
```

#### Google OAuth
```env
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://api.yourdomain.com/api/v1/auth/google/callback
```

#### AWS S3 (Music Storage)
```env
AWS_ACCESS_KEY=your_aws_access_key
AWS_SECRET_KEY=your_aws_secret_key
AWS_S3_BUCKET=your_bucket_name
AWS_REGION=us-east-1
AWS_S3_PRESIGNED_URL_EXPIRY=3600
```

#### Solana Pay (Devnet)
```env
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_MERCHANT_WALLET=your_devnet_phantom_wallet_public_key
SOLANA_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
SOLANA_PAYMENT_EXPIRY_MINUTES=10
```

#### x402 Payment Protocol (Fitness Plans)
```env
X402_ENABLED=true
X402_DATA_OWNER_ID=your_uuid_or_leave_empty_for_first_user
X402_PAY_TO=your_devnet_wallet_public_key
X402_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
X402_PRICE_BASE_UNITS=10000
X402_QUOTE_TTL_SECONDS=600
```

#### Gemini AI (Free Tier)
```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_PROJECT_ID=your_project_id
GEMINI_PROJECT_NUMBER=your_project_number
GEMINI_MODEL=gemini-1.5-flash
```

#### Optional: Audio Processing
```env
YTDLP_PATH=yt-dlp
YTDLP_TEMP_DIR=/tmp/sajilo-khata-audio
FFMPEG_PATH=ffmpeg
```

#### Last.fm API (Music History)
```env
LASTFM_API_KEY=your_lastfm_api_key
LASTFM_BASE_URL=https://ws.audioscrobbler.com/2.0
```

---

## 🚀 Running the Server

### Development
```bash
# Start with hot reload (watches for file changes)
npm run start:dev

# Start with debugging enabled
npm run start:debug

# Watch mode only (no auto-restart)
npm run start:watch
```

### Production
```bash
# Build
npm run build

# Start production server
npm run start:prod
```

### Database Migrations
```bash
# Generate new migration (after entity changes)
npm run migration:generate -- migrations/MigrationName

# Run all pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

### Linting & Formatting
```bash
# Lint code
npm run lint

# Format code
npm run format
```

### Testing
```bash
# Run unit tests
npm test

# Run e2e tests
npm run test:e2e

# Run tests with coverage
npm run test:cov

# Watch mode
npm run test:watch
```

---

## 📡 API Documentation

### Base URL
```
https://api.abinashchhetri.com.np/api/v1
```

### Interactive Documentation
Swagger UI available at: `http://localhost:4000/api/docs`

### Authentication
Most endpoints require a Bearer token in the Authorization header:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://api.abinashchhetri.com.np/api/v1/accounts
```

### Core Endpoints

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/auth/google` | Initiate Google OAuth |
| `GET` | `/auth/google/callback` | OAuth callback (handled by frontend) |
| `GET` | `/auth/me` | Get current user profile |
| `POST` | `/auth/refresh` | Refresh access token |
| `POST` | `/auth/logout` | Logout (revoke tokens) |

#### Accounts
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/accounts` | Create new account |
| `GET` | `/accounts` | List all accounts |
| `GET` | `/accounts/:id` | Get account details |
| `PATCH` | `/accounts/:id` | Update account |
| `DELETE` | `/accounts/:id` | Delete account |

#### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/transactions` | Create transaction |
| `GET` | `/transactions` | List transactions (paginated, filtered) |
| `GET` | `/transactions/:id` | Get transaction details |
| `PATCH` | `/transactions/:id` | Update transaction |
| `DELETE` | `/transactions/:id` | Soft delete transaction |
| `POST` | `/transactions/:id/restore` | Restore deleted transaction |

#### Solana Pay
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/solana-pay/request` | Create payment request (returns QR code) |
| `GET` | `/solana-pay/request/:id` | Get payment request details |
| `GET` | `/solana-pay/request/:id/status` | Poll payment confirmation status |

#### x402 (Payment-Gated AI Plans)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/x402/plans/preview` | View plan pricing & description (free) |
| `GET` | `/x402/plans/generate` | Generate personalized plan (requires x402 payment) |

**x402 Handshake Flow:**
1. `GET /x402/plans/generate` → receive HTTP 402 with payment challenge
2. Send USDC transfer to payment address (via Phantom wallet or agent)
3. `GET /x402/plans/generate` + `X-PAYMENT: base64({quoteId, signature})` → receive plan

#### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/analytics/dashboard` | Summary stats (balance, income, expenses) |
| `GET` | `/analytics/categories` | Spending by category |
| `GET` | `/analytics/top-items` | Top expense categories |
| `GET` | `/analytics/net-worth` | Total asset value |

#### Workouts & Fitness
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/workout/plan/import` | Import workout plan (CSV) |
| `GET` | `/workout/plan` | Get active workout plan |
| `GET` | `/workout/plan/day/:day` | Get specific day's workout |
| `POST` | `/workout/sessions` | Log workout session |
| `GET` | `/workout/sessions/today` | Get today's logged session |
| `GET` | `/workout/progress/:exerciseName` | Track exercise progression |

#### Meals & Nutrition
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/meals/plan/import` | Import meal plan (CSV) |
| `GET` | `/meals/plan` | Get active meal plan |
| `GET` | `/meals/today` | Get today's logged meals |
| `POST` | `/meals/logs` | Log meal consumed |
| `GET` | `/meals/logs` | Get meal logs (filtered) |

---

## 🏗 Architecture

### Project Structure
```
sajilo-khata-backend/
├── src/
│   ├── app.module.ts              # Root module
│   ├── main.ts                    # Bootstrap + security middleware
│   ├── accounts/                  # Account management module
│   ├── transactions/              # Transaction tracking module
│   ├── auth/                      # Google OAuth + JWT module
│   ├── analytics/                 # Dashboard & insights module
│   ├── investments/               # Investment tracking module
│   ├── workout/                   # Fitness planning module
│   ├── meals/                     # Nutrition tracking module
│   ├── solana-pay/                # Solana Pay integration
│   │   ├── entities/              # PaymentRequest entity
│   │   ├── services/              # SolanaPayService
│   │   ├── dto/                   # Request/response DTOs
│   │   └── solana-pay.controller.ts
│   ├── x402/                      # x402 payment protocol
│   │   ├── entities/              # X402Quote, X402Payment
│   │   ├── services/              # X402Service, PlanGeneration
│   │   ├── guards/                # X402PaymentGuard
│   │   ├── filters/               # Exception filter
│   │   ├── dto/                   # DTOs
│   │   └── x402.controller.ts
│   ├── common/                    # Shared utilities
│   │   ├── filters/               # Global exception filter
│   │   ├── interceptors/          # Transform interceptor
│   │   ├── guards/                # JWT auth guard
│   │   └── strategies/            # Passport strategies
│   ├── categories/                # Category seeds & management
│   └── users/                     # User profile management
├── migrations/                    # Database migrations
├── test/                          # E2E tests
├── package.json
├── tsconfig.json
└── typeorm.config.ts              # TypeORM configuration
```

### Module Dependency Graph
```
AppModule
├── ConfigModule (global env vars)
├── TypeOrmModule (database)
├── JwtModule (JWT strategy)
├── PassportModule (OAuth)
├── AuthModule (Google OAuth)
├── UsersModule
├── AccountsModule
├── TransactionsModule
├── AnalyticsModule
├── WorkoutModule
├── MealsModule
├── InvestmentsModule
├── SolanaPayModule (USDC payments)
└── X402Module (payment-gated AI plans)
```

### Request/Response Flow
```
Request
  ↓
CORS Middleware → Helmet → Passport Auth → Route Handler
  ↓
Service (Business Logic) → TypeORM Repository → PostgreSQL
  ↓
Transform Interceptor (wraps response in success envelope)
  ↓
Response: { success: true, message: "...", data: {...} }
```

---

## 💳 Payment Protocols

### 1. Solana Pay (USDC Direct Payments)

**Purpose:** Allow users to receive USDC payments directly into their Sajilo Khata accounts.

**Flow:**
1. User clicks "Receive Payment" → generates Solana Pay QR code
2. Sender scans QR with Phantom Wallet on devnet
3. Phantom shows: "Send 0.01 USDC to [merchant wallet]"
4. Sender approves transaction
5. Backend validates on-chain → auto-logs as income transaction

**Technical Details:**
- SPL Token: USDC (mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`)
- Decimals: 6 (so 0.01 USDC = 10,000 base units)
- RPC: https://api.devnet.solana.com (devnet only)
- Verification: Transaction confirmation + amount + recipient validation

**Endpoints:**
```bash
POST /solana-pay/request
# Returns: { id, status, solanaPayUrl, qrCodeDataUrl, expiresAt }

GET /solana-pay/request/:id/status
# Poll for payment confirmation (backend checks on-chain)
```

### 2. x402 Payment Protocol (AI Plan Generation)

**Purpose:** Monetize AI-generated personalized fitness plans using x402 HTTP 402 Payment Required.

**Flow:**
1. Agent calls `GET /x402/plans/generate` (no header)
2. Backend returns **HTTP 402** with payment challenge:
   ```json
   {
     "x402Version": 1,
     "error": "Payment required",
     "accepts": [{
       "scheme": "exact",
       "network": "solana-devnet",
       "payTo": "...",
       "asset": "USDC_MINT",
       "maxAmountRequired": "10000",
       "extra": { "quoteId": "...", "memo": "x402:..." }
     }]
   }
   ```
3. Agent builds USDC transfer, signs with Phantom, sends to devnet
4. Agent retries: `GET /x402/plans/generate` + `X-PAYMENT: base64({quoteId, signature})`
5. Backend verifies on-chain → runs Gemini → returns **HTTP 200** with plan

**10-Point Payment Verification:**
1. ✅ Quote exists and belongs to requester
2. ✅ Quote not expired (10-min TTL)
3. ✅ Quote not already paid (idempotency check)
4. ✅ Signature not replayed (unique constraint)
5. ✅ Transaction exists on-chain (confirmed commitment)
6. ✅ Transaction succeeded (no on-chain error)
7. ✅ Correct recipient address
8. ✅ Correct USDC mint
9. ✅ Sufficient amount (10,000 base units)
10. ✅ Memo matches (`x402:<quoteId>`)

**Endpoints:**
```bash
GET /x402/plans/preview
# Free: returns price, description, example plan shape

GET /x402/plans/generate
# Paid: requires X-PAYMENT header with valid Solana signature
```

---

## 🗄 Database

### PostgreSQL Setup

#### Create database
```bash
createdb sajilo_khata
psql sajilo_khata -U postgres
```

#### Current Schema (auto-migrated via TypeORM)
- `users` — User profiles (Google OAuth)
- `accounts` — Bank/crypto accounts
- `transactions` — Income/expense transactions
- `categories` — Transaction categories (system + custom)
- `transfers` — Account-to-account transfers
- `investments` — Crypto, stocks, real estate
- `workout_plans` — Imported fitness plans
- `workout_sessions` — Logged workouts
- `meal_plans` — Imported meal plans
- `meal_logs` — Logged meals
- `payment_requests` — Solana Pay requests
- `x402_quotes` — x402 payment quotes
- `x402_payments` — x402 payment records
- `tracks` — Spotify/music history
- `playlists` — User playlists

#### Backup & Restore
```bash
# Backup
pg_dump sajilo_khata > backup.sql

# Restore
psql sajilo_khata < backup.sql

# Export to CSV
psql sajilo_khata -c "COPY transactions TO STDOUT WITH CSV" > transactions.csv
```

---

## 🧪 Testing

### Unit Tests
```bash
npm test

# Watch mode (re-run on file change)
npm run test:watch

# Coverage report
npm run test:cov
```

### E2E Tests
```bash
npm run test:e2e
```

### Manual API Testing

#### Using cURL
```bash
# Get current user (requires JWT)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abinashchhetri.com.np/api/v1/auth/me

# Create transaction
curl -X POST https://api.abinashchhetri.com.np/api/v1/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "expense",
    "amount": 500,
    "categoryId": "...",
    "description": "Coffee",
    "date": "2026-07-13T10:00:00Z"
  }'
```

#### Using Postman
- Import OpenAPI spec: `http://localhost:4000/api/docs-json`
- Set environment variable: `token=YOUR_JWT_TOKEN`
- Use `{{token}}` in Authorization headers

---

## 🚢 Deployment

### Prerequisites for Production
- Vultr / AWS / DigitalOcean instance (Ubuntu 22.04)
- Docker + Docker Compose (recommended)
- PostgreSQL 14+ (managed service or containerized)
- Nginx/Caddy reverse proxy with SSL
- PM2 or systemd for process management

### Docker Deployment
```bash
# Build Docker image
docker build -t sajilo-khata-backend .

# Run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f backend
```

### Systemd Service
```bash
# Create service file
sudo nano /etc/systemd/system/sajilo-khata.service

# Add:
[Unit]
Description=Sajilo Khata Backend
After=network.target

[Service]
Type=simple
User=app
WorkingDirectory=/home/app/sajilo-khata-backend
ExecStart=/usr/bin/npm run start:prod
Restart=always

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl enable sajilo-khata
sudo systemctl start sajilo-khata
```

### SSL with Let's Encrypt
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --nginx -d api.yourdomain.com

# Auto-renewal (runs daily)
sudo systemctl enable certbot.timer
```

### Environment Variables (Production)
```bash
# .env.production
NODE_ENV=production
PORT=4000

# Secure JWT secrets (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
JWT_ACCESS_SECRET=<long_random_string>
JWT_REFRESH_SECRET=<long_random_string>

# Production database (managed service)
DB_HOST=postgres.c.abinashchhetri.com
DB_PASSWORD=<secure_password>

# Solana mainnet (when ready to go live)
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# CORS for production
CORS_ORIGIN=https://dashboard.abinashchhetri.com.np
```

---

## 🤝 Development Guidelines

### Development Workflow
1. Create feature branch: `git checkout -b feature/your-feature`
2. Implement changes following code style guidelines
3. Run tests and linting: `npm run lint && npm test`
4. Commit changes with clear messages: `git commit -m "feat(module): description"`
5. Push to branch and create Pull Request

### Code Style
- TypeScript strict mode enabled
- ESLint enforced (run `npm run lint`)
- Prettier auto-formatting (run `npm run format`)
- 2-space indentation
- SOLID principles + NestJS best practices

### Git Conventions
```bash
# Commit message format:
# <type>(<scope>): <subject>
# 
# <body>
#
# Examples:
git commit -m "feat(auth): add Google OAuth integration"
git commit -m "fix(solana-pay): resolve SPL token URL encoding issue"
git commit -m "docs(readme): update installation instructions"

# Types: feat, fix, docs, style, refactor, test, chore
```

### Code Review
- All code changes require review
- Ensure tests pass before submitting PR
- Update documentation for API changes
- Follow existing code patterns and architecture

---

## 📄 License

All rights reserved. This is a proprietary project. Unauthorized copying, modification, or distribution is prohibited without explicit written permission from the author.

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/sajilo-khata/issues)
- **Email:** abinashchhetri.work@gmail.com
- **Twitter:** [@abinashchhetri](https://twitter.com/abinashchhetri)

---

## 🎉 Acknowledgments

Built with:
- [NestJS](https://nestjs.com/) — Progressive Node.js framework
- [TypeORM](https://typeorm.io/) — ORM for TypeScript
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/) — Blockchain interaction
- [Gemini AI](https://ai.google.dev/) — AI plan generation
- [Passport.js](http://www.passportjs.org/) — Authentication middleware
- [PostgreSQL](https://www.postgresql.org/) — Reliable database

---

## 📝 Project Info

- **Last Updated:** 2026-07-13
- **Version:** 1.0.0
- **Status:** Production Ready ✅
- **Maintainer:** Abinash Chhetri
- **Repository:** Private (Internal Use Only)

### Quick Links
- **Frontend:** [Sajilo Khata Dashboard](https://dashboard.abinashchhetri.com.np)
- **API:** https://api.abinashchhetri.com.np/api/v1
- **Email:** abinashchhetri.work@gmail.com
