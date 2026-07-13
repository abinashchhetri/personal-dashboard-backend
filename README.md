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

## 🧪 Testing x402 Locally — Complete Guide

This section provides step-by-step instructions to fully test and verify the x402 payment protocol implementation. Judges and developers can follow these steps to see the feature in action.

### Prerequisites

Before testing, ensure you have the following set up:

#### 1. Install Phantom Wallet
- Download from: https://phantom.app/
- Install as a browser extension (Chrome, Firefox, Edge)
- Create or import a devnet wallet
- **Important**: Switch to **Devnet** network in Phantom settings (Settings → Developer Settings → Enable Testnet Mode → Select Devnet)

#### 2. Get Devnet SOL (for gas fees)
```bash
# Visit: https://faucet.solana.com
# Paste your devnet Phantom wallet public key
# Request 2-5 SOL (free, instant)
# You'll receive devnet SOL for transaction fees
```

#### 3. Get Devnet USDC (payment token)
```bash
# Visit: https://faucet.circle.com
# Select "Solana" → "Devnet"
# Paste your devnet Phantom wallet public key
# Request 100 USDC (free, instant)
# You'll receive devnet USDC for testing payments
```

#### 4. Clone Repositories
```bash
# Backend
git clone https://github.com/abinashchhetri/personal-dashboard-backend
cd personal-dashboard-backend

# Frontend (optional, for UI testing)
git clone https://github.com/abinashchhetri/sajilo_khata
cd sajilo_khata
```

---

### Complete x402 Testing Flow

#### **Phase 1: Backend Setup**

##### Step 1a: Install Dependencies
```bash
cd personal-dashboard-backend
npm install
```

##### Step 1b: Configure Environment Variables
Create `.env` file with devnet configuration:

```env
# App
NODE_ENV=development
PORT=4000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=sajilo_khata

# JWT
JWT_ACCESS_SECRET=your_secret_key_at_least_32_chars_long
JWT_REFRESH_SECRET=your_refresh_secret_at_least_32_chars

# Solana (Devnet)
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_MERCHANT_WALLET=CBGw1bivXgWhkLJwNe6wqiEwkEr5vdLtf4ZepE9KZLq4
SOLANA_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# x402 Payment Protocol
X402_ENABLED=true
X402_DATA_OWNER_ID=16db2269-4850-4173-9472-e1149113671e
X402_PAY_TO=CBGw1bivXgWhkLJwNe6wqiEwkEr5vdLtf4ZepE9KZLq4
X402_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
X402_PRICE_BASE_UNITS=10000
X402_QUOTE_TTL_SECONDS=600

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key_from_https://aistudio.google.com
GEMINI_PROJECT_ID=your_project_id
GEMINI_PROJECT_NUMBER=your_project_number
GEMINI_MODEL=gemini-1.5-flash
```

##### Step 1c: Start Backend
```bash
npm run start:dev
```

**Expected Output:**
```
[Nest] 12345 - 07/13/2026, 11:00:00 AM     LOG [NestFactory] Starting Nest application...
[Nest] 12345 - 07/13/2026, 11:00:01 AM     LOG [InstanceLoader] X402Module dependencies initialized
[Nest] 12345 - 07/13/2026, 11:00:02 AM     LOG [X402Service] X402Service initialized: payTo=CBGw1bivXgWhkLJwNe6wqiEwkEr5vdLtf4ZepE9KZLq4, price=10000 base units
[Nest] 12345 - 07/13/2026, 11:00:03 AM     LOG [NestApplication] Nest application successfully started
```

Backend is now running at: `http://localhost:4000/api/v1`

---

#### **Phase 2: Testing x402 Payment Flow**

##### Step 2a: Request Payment Challenge (Get HTTP 402)

**Request:**
```bash
curl -X GET http://localhost:4000/api/v1/x402/plans/preview
```

**Expected Response (HTTP 200 — Free Preview):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "resource": "GET /api/v1/x402/plans/generate",
    "priceUsdc": "0.01",
    "network": "solana-devnet",
    "description": "AI-generated personalized 7-day workout + meal plan based on your 90-day fitness and nutrition history",
    "example": {
      "generatedAt": "2026-07-13T...",
      "historyAnalysis": {...},
      "generatedPlan": {...}
    }
  }
}
```

**Now request the paid endpoint (without payment header — expect 402):**
```bash
curl -v -X GET http://localhost:4000/api/v1/x402/plans/generate
```

**Expected Response (HTTP 402 — Payment Required):**
```json
{
  "x402Version": 1,
  "error": "Payment required",
  "accepts": [
    {
      "scheme": "exact",
      "network": "solana-devnet",
      "resource": "https://api.abinashchhetri.com.np/api/v1/x402/plans/generate",
      "description": "AI-generated personalized 7-day workout + meal plan based on your 90-day fitness and nutrition history",
      "mimeType": "application/json",
      "payTo": "CBGw1bivXgWhkLJwNe6wqiEwkEr5vdLtf4ZepE9KZLq4",
      "asset": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
      "maxAmountRequired": "10000",
      "maxTimeoutSeconds": 600,
      "extra": {
        "quoteId": "76daa663-ecb7-4808-9dd0-3906c9cc0629",
        "memo": "x402:76daa663-ecb7-4808-9dd0-3906c9cc0629",
        "decimals": 6,
        "flow": "signature-presentation",
        "instructions": "Send an SPL transfer of 10000 base units of USDC to CBGw1bivXgWhkLJwNe6wqiEwkEr5vdLtf4ZepE9KZLq4, attach a Memo instruction containing x402:76daa663-..., await confirmed, then retry this request with header X-PAYMENT: base64(JSON{quoteId,signature})."
      }
    }
  ]
}
```

**Save these values for next step:**
```bash
QUOTE_ID="76daa663-ecb7-4808-9dd0-3906c9cc0629"
MEMO="x402:76daa663-ecb7-4808-9dd0-3906c9cc0629"
RECIPIENT="CBGw1bivXgWhkLJwNe6wqiEwkEr5vdLtf4ZepE9KZLq4"
AMOUNT_USDC="0.01"
AMOUNT_BASE_UNITS="10000"
USDC_MINT="4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
```

---

##### Step 2b: Send USDC Payment via Phantom Wallet

**Option A: Using Phantom UI (Easiest for testing)**

1. Open Phantom Wallet in browser
2. Ensure you're on **Devnet** network
3. Click **Send** button
4. **Recipient**: Paste `CBGw1bivXgWhkLJwNe6wqiEwkEr5vdLtf4ZepE9KZLq4`
5. **Token**: Select **USDC**
6. **Amount**: Enter `0.01`
7. **Add Memo**: Enable and paste `x402:76daa663-ecb7-4808-9dd0-3906c9cc0629`
8. **Review** and click **Confirm**
9. **Wait** for "Transaction Confirmed" message
10. **Copy Transaction Signature** from Phantom (click on tx, copy address)

**Option B: Using TypeScript/JavaScript (Programmatic)**

Create `send-payment.js`:
```javascript
const { Connection, PublicKey, Transaction, Keypair } = require('@solana/web3.js');
const { createTransferCheckedInstruction, getAssociatedTokenAddress } = require('@solana/spl-token');
const base58 = require('bs58');

async function sendX402Payment() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Your devnet wallet private key (from Phantom export)
  const secretKey = Buffer.from([/* your 64-byte secret key */]);
  const payer = Keypair.fromSecretKey(secretKey);
  
  const mint = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
  const recipient = new PublicKey('CBGw1bivXgWhkLJwNe6wqiEwkEr5vdLtf4ZepE9KZLq4');
  const quoteId = '76daa663-ecb7-4808-9dd0-3906c9cc0629';

  try {
    // Get token accounts
    const fromAta = await getAssociatedTokenAddress(mint, payer.publicKey);
    const toAta = await getAssociatedTokenAddress(mint, recipient);

    // Transfer instruction
    const transferIx = createTransferCheckedInstruction(
      fromAta,
      mint,
      toAta,
      payer.publicKey,
      BigInt(10000), // 0.01 USDC (6 decimals)
      6
    );

    // Memo instruction
    const memoIx = new (require('@solana/web3.js').TransactionInstruction)({
      keys: [],
      programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
      data: Buffer.from(`x402:${quoteId}`, 'utf-8')
    });

    // Build transaction
    const tx = new Transaction().add(transferIx, memoIx);
    tx.feePayer = payer.publicKey;
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;

    // Sign and send
    const signed = await connection.sendRawTransaction(tx.serialize());
    console.log('✅ Payment sent:', signed);
    
    await connection.confirmTransaction(signed, 'confirmed');
    console.log('✅ Payment confirmed:', signed);
    
    return signed;
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

sendX402Payment();
```

Run:
```bash
npm install @solana/web3.js @solana/spl-token bs58
node send-payment.js
```

**After payment is confirmed, save the transaction signature:**
```bash
TX_SIGNATURE="H8vRtx7vT9kL2mN5pQ8sT1uV4wX7yZ9aB2cD5eF8gH9iJ2kL5mN8pQ1rS4tU7vW"
```

---

##### Step 2c: Verify Payment on Solana Explorer

Before retrying, verify the payment was sent correctly:

```bash
# Open in browser:
https://explorer.solana.com/tx/$TX_SIGNATURE?cluster=devnet

# Look for:
✅ Status: Success
✅ From: Your wallet address
✅ To: CBGw1bivXgWhkLJwNe6wqiEwkEr5vdLtf4ZepE9KZLq4
✅ Token: USDC
✅ Amount: 0.01 USDC
✅ Memo: x402:76daa663-ecb7-4808-9dd0-3906c9cc0629
```

---

##### Step 2d: Retry with Payment Proof Header

Now send the payment signature to unlock the plan:

```bash
# Build X-PAYMENT header (base64 encoded JSON)
PAYMENT_JSON='{"quoteId":"76daa663-ecb7-4808-9dd0-3906c9cc0629","signature":"H8vRtx7vT9kL2mN5pQ8sT1uV4wX7yZ9aB2cD5eF8gH9iJ2kL5mN8pQ1rS4tU7vW"}'
PAYMENT_HEADER=$(echo -n "$PAYMENT_JSON" | base64)

# Request with payment proof
curl -X GET http://localhost:4000/api/v1/x402/plans/generate \
  -H "X-PAYMENT: $PAYMENT_HEADER" \
  -H "Content-Type: application/json"
```

**Expected Response (HTTP 200 — Success with Generated Plan):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "generatedAt": "2026-07-13T11:05:00.000Z",
    "historyAnalysis": {
      "workoutDays": 24,
      "plannedDays": 30,
      "adherence": 0.8,
      "focusMuscles": ["back", "chest", "legs"],
      "recentProgress": "Deadlift +18kg in 12 weeks, Bench +8kg, good consistency",
      "mealsLogged": 87,
      "adherenceMeals": 0.78,
      "averageDailyCalories": 2420,
      "macroBalance": "Protein-heavy (145g/day avg), carbs adequate"
    },
    "generatedPlan": {
      "startDate": "2026-07-14",
      "endDate": "2026-07-20",
      "rationale": "Based on your 80% workout adherence and strength gains, we are increasing intensity on compound lifts while maintaining meal consistency. Focus: consolidate lower body, build chest endurance.",
      "workouts": [
        {
          "day": "Monday",
          "name": "Heavy Back Day",
          "exercises": [
            {
              "name": "Deadlift",
              "sets": 5,
              "reps": 3,
              "weight": 160,
              "notes": "Estimated max from progress: 178kg 1RM. Maintain form."
            },
            {
              "name": "Barbell Row",
              "sets": 4,
              "reps": 6,
              "weight": 115,
              "notes": "+5kg from last PR, conservative progression"
            },
            {
              "name": "Lat Pulldown",
              "sets": 3,
              "reps": 10,
              "weight": 115,
              "notes": "Hypertrophy focus"
            }
          ],
          "duration": 50,
          "notes": "Rest 3 min between compound sets"
        },
        {
          "day": "Tuesday",
          "name": "Chest & Triceps",
          "exercises": [
            {
              "name": "Bench Press",
              "sets": 4,
              "reps": 6,
              "weight": 100,
              "notes": "Explosive reps"
            }
          ],
          "duration": 45,
          "notes": "Rest 2 min between sets"
        }
      ],
      "meals": [
        {
          "day": "Monday",
          "type": "breakfast",
          "name": "Oatmeal with berries and almonds",
          "calories": 420,
          "protein": 15,
          "carbs": 65,
          "fat": 12,
          "notes": "Pre-workout fuel"
        },
        {
          "day": "Monday",
          "type": "lunch",
          "name": "Grilled chicken breast with rice and broccoli",
          "calories": 580,
          "protein": 45,
          "carbs": 70,
          "fat": 8,
          "notes": "Post-workout meal"
        },
        {
          "day": "Monday",
          "type": "dinner",
          "name": "Salmon with sweet potato and green beans",
          "calories": 650,
          "protein": 40,
          "carbs": 60,
          "fat": 18,
          "notes": "Omega-3 rich"
        }
      ]
    },
    "nextSteps": "Follow this plan for consistency. Log your actual performance daily. If you skip more than 2 workouts, re-generate for an adjusted plan."
  }
}
```

✅ **Success!** You have successfully completed the x402 payment flow.

---

#### **Phase 3: Verification Checklist for Judges**

Use this checklist to verify all aspects of the x402 implementation:

| Component | Verification Step | Expected Result |
|-----------|------------------|-----------------|
| **x402 Protocol Version** | Check response `x402Version` field in 402 response | Should be `1` |
| **Quote Generation** | Check `extra.quoteId` in 402 response | Should be a valid UUID |
| **Quote TTL** | Check `maxTimeoutSeconds` in 402 response | Should be `600` (10 minutes) |
| **Recipient Address** | Check `payTo` field | Should be `CBGw1bivXgWhkLJwNe6wqiEwkEr5vdLtf4ZepE9KZLq4` |
| **USDC Mint** | Check `asset` field | Should be `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| **Price** | Check `maxAmountRequired` | Should be `10000` (0.01 USDC in base units) |
| **Memo Format** | Check `extra.memo` | Should match `x402:<quoteId>` |
| **On-Chain Payment** | Send USDC transfer with memo | Transaction appears on devnet explorer |
| **Signature Verification** | Verify tx signature on Solana Explorer | Status shows Success |
| **Payment Header Parsing** | Construct `X-PAYMENT: base64({quoteId, signature})` | Header is valid base64 JSON |
| **Plan Generation** | Retry /generate with X-PAYMENT header | Receives HTTP 200 with generated plan |
| **AI Integration** | Check generated plan response | Contains workouts and meals from Gemini |
| **History Analysis** | Check `historyAnalysis` field | Shows workout adherence, calories, macros |
| **Plan Details** | Check `generatedPlan.workouts[].exercises[]` | Shows realistic exercises with weights/reps |
| **Meal Logging** | Check `generatedPlan.meals[]` | Shows breakfast/lunch/dinner with calories/macros |
| **Devnet Evidence** | Open Solana Explorer URL | Transaction visible with correct memo |

---

#### **Phase 4: Complete Testing Script**

For faster testing, use this all-in-one script:

**File: `test-x402-complete.sh`**
```bash
#!/bin/bash

set -e

API_URL="http://localhost:4000/api/v1"
PHANTOM_WALLET="your_devnet_wallet_here"
TX_SIGNATURE="your_tx_signature_here"

echo "🚀 x402 Testing Script"
echo "===================="
echo ""

# Step 1: Get preview
echo "📍 Step 1: Getting plan preview..."
PREVIEW=$(curl -s -X GET "$API_URL/x402/plans/preview")
echo "✅ Preview received"
echo ""

# Step 2: Request payment challenge
echo "📍 Step 2: Requesting payment challenge (HTTP 402)..."
CHALLENGE=$(curl -s -X GET "$API_URL/x402/plans/generate")
QUOTE_ID=$(echo "$CHALLENGE" | grep -o '"quoteId":"[^"]*' | cut -d'"' -f4)
echo "✅ Quote received: $QUOTE_ID"
echo ""

# Step 3: Payment step (manual in UI or script)
echo "📍 Step 3: Manual payment step required"
echo "   Send 0.01 USDC to: CBGw1bivXgWhkLJwNe6wqiEwkEr5vdLtf4ZepE9KZLq4"
echo "   With memo: x402:$QUOTE_ID"
echo "   Then paste the transaction signature below:"
read -p "   Tx Signature: " TX_SIGNATURE
echo ""

# Step 4: Verify on explorer
echo "📍 Step 4: Verifying on Solana Explorer..."
EXPLORER_URL="https://explorer.solana.com/tx/$TX_SIGNATURE?cluster=devnet"
echo "   Open this URL to verify: $EXPLORER_URL"
echo ""

# Step 5: Retry with payment proof
echo "📍 Step 5: Retrying with payment proof..."
PAYMENT_JSON="{\"quoteId\":\"$QUOTE_ID\",\"signature\":\"$TX_SIGNATURE\"}"
PAYMENT_HEADER=$(echo -n "$PAYMENT_JSON" | base64)

PLAN=$(curl -s -X GET "$API_URL/x402/plans/generate" \
  -H "X-PAYMENT: $PAYMENT_HEADER" \
  -H "Content-Type: application/json")

if echo "$PLAN" | grep -q '"generatedAt"'; then
  echo "✅ Plan received successfully!"
  echo ""
  echo "📋 Generated Plan Summary:"
  echo "$PLAN" | grep -o '"day":"[^"]*\|"name":"[^"]*' | head -10
else
  echo "❌ Error receiving plan"
  echo "$PLAN"
fi

echo ""
echo "✅ x402 Test Complete!"
```

Run:
```bash
chmod +x test-x402-complete.sh
./test-x402-complete.sh
```

---

### Troubleshooting

| Issue | Solution |
|-------|----------|
| **HTTP 402 not returned** | Check backend is running, X402_ENABLED=true in .env |
| **Quote ID is empty** | Ensure response is valid JSON, check backend logs |
| **Payment rejected** | Verify: recipient address correct, amount is 0.01 USDC, memo included |
| **"Signature not verified"** | Check X-PAYMENT header is valid base64, signature matches tx |
| **No plan returned** | Check GEMINI_API_KEY is set, payment was actually sent (verify on explorer) |
| **Timeout error** | Verify Solana RPC is reachable: `curl https://api.devnet.solana.com` |

---

### What Judges Should See

When evaluating the x402 implementation, judges should verify:

1. ✅ **x402 Protocol Compliance**
   - HTTP 402 response returned when no payment header
   - Structured `x402Version`, `accepts`, `extra` fields
   - 10-minute quote TTL

2. ✅ **On-Chain Payment Verification**
   - Transaction exists on Solana devnet explorer
   - Correct recipient, amount (0.01 USDC), and memo
   - Payment verified via signature validation

3. ✅ **AI Integration**
   - Generated plan uses Gemini AI, not hardcoded
   - Plan reflects user's fitness history (adherence, calories, etc.)
   - Personalized recommendations with realistic progression

4. ✅ **Production-Ready**
   - Zero hardcoded payment proofs
   - Unique quoteId for each request
   - TTL prevents replay attacks
   - Clear error handling

---

## 📊 x402 Feature Metrics

| Metric | Value |
|--------|-------|
| **Payment Amount** | 0.01 USDC (~$0.01) |
| **Network** | Solana devnet |
| **Token** | USDC (6 decimals) |
| **Quote TTL** | 10 minutes (600 seconds) |
| **Verification Points** | 10 on-chain checks |
| **AI Provider** | Google Gemini 1.5 Flash |
| **Plan Duration** | 7 days (customizable) |

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
