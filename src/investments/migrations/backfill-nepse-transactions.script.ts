// src/investments/migrations/backfill-nepse-transactions.script.ts
// ─────────────────────────────────────────────────────────────────────────────
// One-time backfill: existing NEPSE investments stored quantity/buyPricePerUnit
// /broker in `metadata`. This reads that data and inserts one synthetic BUY
// transaction per investment, dated at `startedAt` (falling back to `createdAt`).
// Idempotent — skips any investment that already has transaction rows, so it's
// safe to re-run if interrupted.
//
// Run with:
//   npx ts-node -r tsconfig-paths/register src/investments/migrations/backfill-nepse-transactions.script.ts
// ─────────────────────────────────────────────────────────────────────────────

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from 'src/app.module';
import { Investment } from '../entities/investment.entity';
import { InvestmentTransaction } from '../entities/investment-transaction.entity';
import { InvestmentTypeEnum } from '../enums/investment-type.enum';
import { InvestmentTransactionTypeEnum } from '../enums/transaction-type.enum';

const logger = new Logger('BackfillNepseTransactions');

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  const investmentRepo = dataSource.getRepository(Investment);
  const transactionRepo = dataSource.getRepository(InvestmentTransaction);

  const nepseInvestments = await investmentRepo.find({
    where: { type: InvestmentTypeEnum.NEPSE },
  });

  let backfilled = 0;
  let skipped = 0;

  for (const inv of nepseInvestments) {
    const existingCount = await transactionRepo.count({ where: { investmentId: inv.id } });
    if (existingCount > 0) {
      logger.log(`Skip "${inv.name}" (${inv.id}) — already has ${existingCount} transaction(s)`);
      skipped++;
      continue;
    }

    const { quantity, buyPricePerUnit, broker } = inv.metadata ?? {};
    if (!quantity || !buyPricePerUnit) {
      logger.warn(`Skip "${inv.name}" (${inv.id}) — missing quantity/buyPricePerUnit in metadata`);
      skipped++;
      continue;
    }

    const transaction = transactionRepo.create({
      investmentId: inv.id,
      transactionType: InvestmentTransactionTypeEnum.BUY,
      quantity: Number(quantity),
      pricePerUnit: Number(buyPricePerUnit),
      transactionDate: inv.startedAt ?? inv.createdAt,
      note: broker ? `Backfilled from metadata — broker: ${broker}` : 'Backfilled from metadata',
    });
    await transactionRepo.save(transaction);

    logger.log(`Backfilled "${inv.name}" (${inv.id}): ${quantity} units @ ${buyPricePerUnit}`);
    backfilled++;
  }

  logger.log(`Done. Backfilled ${backfilled}, skipped ${skipped}, total ${nepseInvestments.length}.`);
  await app.close();
}

run().catch((err) => {
  logger.error('Backfill failed', err);
  process.exit(1);
});
