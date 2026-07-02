import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { AbstractRepository } from 'src/common/database/abstract.repository';
import { InvestmentTransaction } from '../entities/investment-transaction.entity';
import { InvestmentTransactionTypeEnum } from '../enums/transaction-type.enum';

export interface InvestmentTransactionStats {
  remainingQuantity: number;
  averageBuyPrice: number;
  totalRealizedGainLoss: number;
}

@Injectable()
export class InvestmentTransactionsRepository extends AbstractRepository<InvestmentTransaction> {
  protected readonly logger = new Logger(InvestmentTransactionsRepository.name);

  constructor(
    @InjectRepository(InvestmentTransaction)
    entityRepository: Repository<InvestmentTransaction>,
    entityManager: EntityManager,
  ) {
    super(entityRepository, entityManager);
  }

  // Accepts an optional EntityManager so callers inside a QueryRunner (e.g. the
  // sell + auto-deactivation flow) write through the same connection/transaction.
  async createTransaction(
    data: Partial<InvestmentTransaction>,
    manager?: EntityManager,
  ): Promise<InvestmentTransaction> {
    const em = manager ?? this.entityRepository.manager;
    const transaction = em.create(InvestmentTransaction, data);
    return em.save(InvestmentTransaction, transaction);
  }

  async findAllForInvestment(
    investmentId: string,
    pagination: { skip: number; take: number },
  ): Promise<[InvestmentTransaction[], number]> {
    return this.entityRepository
      .createQueryBuilder('t')
      .where('t.investmentId = :investmentId', { investmentId })
      .orderBy('t.transactionDate', 'DESC')
      .addOrderBy('t.createdAt', 'DESC')
      .skip(pagination.skip)
      .take(pagination.take)
      .getManyAndCount();
  }

  // totalBought - totalSold, across all transaction rows for this investment.
  // Accepts an optional EntityManager so it can be read inside the same
  // QueryRunner transaction as a just-inserted SELL row (uncommitted reads from
  // a separate connection wouldn't see it).
  async computeRemainingQuantity(investmentId: string, manager?: EntityManager): Promise<number> {
    const repo = manager ? manager.getRepository(InvestmentTransaction) : this.entityRepository;
    const raw = await repo
      .createQueryBuilder('t')
      .select(
        `COALESCE(SUM(CASE WHEN t."transactionType" = '${InvestmentTransactionTypeEnum.BUY}' THEN t.quantity ELSE -t.quantity END), 0)`,
        'remainingQuantity',
      )
      .where('t.investmentId = :investmentId', { investmentId })
      .getRawOne<{ remainingQuantity: string }>();

    return Number(raw?.remainingQuantity ?? 0);
  }

  // Weighted average cost per unit across BUY transactions only (brokerage fees
  // included in cost) — standard WAC method, unaffected by later sells.
  async computeWeightedAverageBuyPrice(investmentId: string): Promise<number> {
    const raw = await this.entityRepository
      .createQueryBuilder('t')
      .select(`COALESCE(SUM(t.quantity * t."pricePerUnit" + COALESCE(t."brokerageFee", 0)), 0)`, 'totalCost')
      .addSelect(`COALESCE(SUM(t.quantity), 0)`, 'totalQuantity')
      .where('t.investmentId = :investmentId', { investmentId })
      .andWhere('t.transactionType = :type', { type: InvestmentTransactionTypeEnum.BUY })
      .getRawOne<{ totalCost: string; totalQuantity: string }>();

    const totalQuantity = Number(raw?.totalQuantity ?? 0);
    if (totalQuantity === 0) return 0;
    return Number(raw?.totalCost ?? 0) / totalQuantity;
  }

  // Sum of realizedGainLoss across all SELL rows for this investment.
  async computeRealizedGainLoss(investmentId: string): Promise<number> {
    const raw = await this.entityRepository
      .createQueryBuilder('t')
      .select(`COALESCE(SUM(t."realizedGainLoss"), 0)`, 'totalRealizedGainLoss')
      .where('t.investmentId = :investmentId', { investmentId })
      .andWhere('t.transactionType = :type', { type: InvestmentTransactionTypeEnum.SELL })
      .getRawOne<{ totalRealizedGainLoss: string }>();

    return Number(raw?.totalRealizedGainLoss ?? 0);
  }

  // Bulk variant of remainingQuantity + averageBuyPrice + realized gain for list
  // views — one grouped query instead of N+1 per-investment queries.
  async computeStatsForInvestments(
    investmentIds: string[],
  ): Promise<Map<string, InvestmentTransactionStats>> {
    const stats = new Map<string, InvestmentTransactionStats>();
    if (investmentIds.length === 0) return stats;

    const rows = await this.entityRepository
      .createQueryBuilder('t')
      .select(`t."investmentId"`, 'investmentId')
      .addSelect(
        `COALESCE(SUM(CASE WHEN t."transactionType" = '${InvestmentTransactionTypeEnum.BUY}' THEN t.quantity ELSE -t.quantity END), 0)`,
        'remainingQuantity',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN t."transactionType" = '${InvestmentTransactionTypeEnum.BUY}' THEN t.quantity * t."pricePerUnit" + COALESCE(t."brokerageFee", 0) ELSE 0 END), 0)`,
        'totalBuyCost',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN t."transactionType" = '${InvestmentTransactionTypeEnum.BUY}' THEN t.quantity ELSE 0 END), 0)`,
        'totalBuyQuantity',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN t."transactionType" = '${InvestmentTransactionTypeEnum.SELL}' THEN COALESCE(t."realizedGainLoss", 0) ELSE 0 END), 0)`,
        'totalRealizedGainLoss',
      )
      .where('t.investmentId IN (:...investmentIds)', { investmentIds })
      .groupBy(`t."investmentId"`)
      .getRawMany<{
        investmentId: string;
        remainingQuantity: string;
        totalBuyCost: string;
        totalBuyQuantity: string;
        totalRealizedGainLoss: string;
      }>();

    for (const row of rows) {
      const totalBuyQuantity = Number(row.totalBuyQuantity);
      stats.set(row.investmentId, {
        remainingQuantity: Number(row.remainingQuantity),
        averageBuyPrice: totalBuyQuantity > 0 ? Number(row.totalBuyCost) / totalBuyQuantity : 0,
        totalRealizedGainLoss: Number(row.totalRealizedGainLoss),
      });
    }

    return stats;
  }
}
