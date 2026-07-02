import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { Investment } from './entities/investment.entity';
import { InvestmentTypeEnum } from './enums/investment-type.enum';
import { InvestmentTransactionTypeEnum } from './enums/transaction-type.enum';
import {
  InvestmentTransactionStats,
  InvestmentTransactionsRepository,
} from './repositories/investment-transactions.repository';
import { InvestmentsRepository } from './repositories/investments.repository';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { FindAllInvestmentsDto } from './dto/find-all-investments.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { PaginationQueryDto } from 'src/common/dtos/pagination.dto';

type EnrichedInvestment = Omit<Investment, 'updateTimestamp'> & {
  unrealizedGainLoss: number | null;
  totalRealizedGainLoss: number;
  remainingQuantity?: number;
  averageBuyPrice?: number;
};

@Injectable()
export class InvestmentsService {
  constructor(
    private readonly investmentsRepository: InvestmentsRepository,
    private readonly investmentTransactionsRepository: InvestmentTransactionsRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateInvestmentDto, userId: string): Promise<EnrichedInvestment> {
    const investment = await this.investmentsRepository.createInvestment({
      userId,
      type: dto.type,
      name: dto.name,
      investedAmount: dto.investedAmount,
      currentValue: dto.currentValue ?? null,
      metadata: dto.metadata ?? {},
      isActive: true,
      startedAt: dto.startedAt ? new Date(dto.startedAt) : null,
    });

    return this.enrichInvestment(investment);
  }

  async findAll(dto: FindAllInvestmentsDto, userId: string) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const skip = (page - 1) * limit;

    const [investments, total] = await this.investmentsRepository.findAllForUser(
      userId,
      dto,
      { skip, take: limit },
    );

    const nepseIds = investments
      .filter((inv) => inv.type === InvestmentTypeEnum.NEPSE)
      .map((inv) => inv.id);
    const statsMap = await this.investmentTransactionsRepository.computeStatsForInvestments(
      nepseIds,
    );

    return {
      data: investments.map((inv) => this.enrichInvestment(inv, statsMap.get(inv.id))),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    };
  }

  async findOne(id: string, userId: string): Promise<EnrichedInvestment> {
    const inv = await this.investmentsRepository.findOne({ id, userId } as any);
    const stats = await this.getNepseStats(inv);
    return this.enrichInvestment(inv, stats);
  }

  async update(id: string, dto: UpdateInvestmentDto, userId: string): Promise<EnrichedInvestment> {
    const investment = await this.investmentsRepository.findOne({ id, userId } as any);

    const isUpdatingValue =
      dto.currentValue !== undefined && investment.currentValue !== null;

    if (isUpdatingValue) {
      // Snapshot old value and apply update atomically so history and the new
      // value are always in sync — a partial write leaves inconsistent state.
      const qr = this.dataSource.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();

      try {
        await this.investmentsRepository.snapshotCurrentValue(
          id,
          investment.currentValue!,
          qr.manager,
        );
        await qr.manager.update(Investment, { id, userId }, dto as any);
        await qr.commitTransaction();
      } catch (err) {
        await qr.rollbackTransaction();
        throw err;
      } finally {
        await qr.release();
      }
    } else {
      await this.investmentsRepository.findOneAndUpdate(
        { id, userId } as any,
        dto as any,
      );
    }

    const updated = await this.investmentsRepository.findOne({ id, userId } as any);
    const stats = await this.getNepseStats(updated);
    return this.enrichInvestment(updated, stats);
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    await this.investmentsRepository.findOne({ id, userId } as any);
    await this.investmentsRepository.findOneAndDelete({ id, userId } as any);
    return { message: 'Investment deleted successfully' };
  }

  async getPortfolioSummary(userId: string) {
    const investments = await this.investmentsRepository.find({ userId } as any);

    const nepseIds = investments
      .filter((inv) => inv.type === InvestmentTypeEnum.NEPSE)
      .map((inv) => inv.id);
    const statsMap = await this.investmentTransactionsRepository.computeStatsForInvestments(
      nepseIds,
    );

    let totalInvested = 0;
    let totalCurrentValue = 0;
    let totalRealizedGainLoss = 0;
    let totalUnrealizedGainLoss = 0;

    const byType: Record<
      string,
      { totalInvested: number; totalCurrentValue: number; totalGainLoss: number }
    > = {};

    for (const inv of investments) {
      const stats = statsMap.get(inv.id);
      const investedAmount = this.resolveInvestedAmount(inv, stats);
      // Treat null currentValue as investedAmount (assume at cost until updated).
      const cv = inv.currentValue ?? investedAmount;

      totalInvested += investedAmount;
      totalCurrentValue += cv;
      totalUnrealizedGainLoss += cv - investedAmount;
      totalRealizedGainLoss += stats?.totalRealizedGainLoss ?? 0;

      if (!byType[inv.type]) {
        byType[inv.type] = { totalInvested: 0, totalCurrentValue: 0, totalGainLoss: 0 };
      }
      byType[inv.type].totalInvested += investedAmount;
      byType[inv.type].totalCurrentValue += cv;
    }

    for (const type of Object.keys(byType)) {
      const bucket = byType[type];
      bucket.totalInvested = round2(bucket.totalInvested);
      bucket.totalCurrentValue = round2(bucket.totalCurrentValue);
      bucket.totalGainLoss = round2(bucket.totalCurrentValue - bucket.totalInvested);
    }

    const roundedInvested = round2(totalInvested);
    const roundedCurrentValue = round2(totalCurrentValue);
    const totalGainLoss = round2(roundedCurrentValue - roundedInvested);
    const totalGainLossPercent =
      roundedInvested > 0
        ? round2((totalGainLoss / roundedInvested) * 100)
        : 0;

    return {
      totalInvested: roundedInvested,
      totalCurrentValue: roundedCurrentValue,
      totalGainLoss,
      totalGainLossPercent,
      totalRealizedGainLoss: round2(totalRealizedGainLoss),
      totalUnrealizedGainLoss: round2(totalUnrealizedGainLoss),
      byType,
    };
  }

  // ── transactions (NEPSE buy/sell ledger) ───────────────────────────────────────

  async createTransaction(
    investmentId: string,
    dto: CreateTransactionDto,
    userId: string,
  ): Promise<EnrichedInvestment> {
    const investment = await this.investmentsRepository.findOne({
      id: investmentId,
      userId,
    } as any);

    if (investment.type !== InvestmentTypeEnum.NEPSE) {
      throw new BadRequestException(
        'Buy/sell transactions are only supported for NEPSE investments',
      );
    }

    const isSell = dto.transactionType === InvestmentTransactionTypeEnum.SELL;
    let realizedGainLoss: number | null = null;

    if (isSell) {
      const remaining = await this.investmentTransactionsRepository.computeRemainingQuantity(
        investmentId,
      );
      if (dto.quantity > remaining) {
        throw new BadRequestException(
          `Cannot sell ${dto.quantity} units — only ${remaining} remaining`,
        );
      }

      // Locked in now, from the average buy price at this moment — never
      // recalculated retroactively even if later buys shift the running average.
      const avgBuyPrice = await this.investmentTransactionsRepository.computeWeightedAverageBuyPrice(
        investmentId,
      );
      realizedGainLoss = round2(
        (dto.pricePerUnit - avgBuyPrice) * dto.quantity - (dto.brokerageFee ?? 0),
      );
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      await this.investmentTransactionsRepository.createTransaction(
        {
          investmentId,
          transactionType: dto.transactionType,
          quantity: dto.quantity,
          pricePerUnit: dto.pricePerUnit,
          transactionDate: dto.transactionDate ? new Date(dto.transactionDate) : new Date(),
          brokerageFee: dto.brokerageFee ?? null,
          note: dto.note ?? null,
          realizedGainLoss,
        },
        qr.manager,
      );

      if (isSell) {
        // Read within the same transaction so the just-inserted SELL row counts.
        const remainingAfter = await this.investmentTransactionsRepository.computeRemainingQuantity(
          investmentId,
          qr.manager,
        );
        if (remainingAfter <= 0) {
          await qr.manager.update(Investment, { id: investmentId }, { isActive: false });
        }
      }

      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }

    const updated = await this.investmentsRepository.findOne({
      id: investmentId,
      userId,
    } as any);
    const stats = await this.getNepseStats(updated);
    return this.enrichInvestment(updated, stats);
  }

  async getRealizedGainLoss(investmentId: string): Promise<number> {
    return round2(
      await this.investmentTransactionsRepository.computeRealizedGainLoss(investmentId),
    );
  }

  async listTransactions(investmentId: string, userId: string, dto: PaginationQueryDto) {
    await this.investmentsRepository.findOne({ id: investmentId, userId } as any);

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const skip = (page - 1) * limit;

    const [transactions, total] =
      await this.investmentTransactionsRepository.findAllForInvestment(investmentId, {
        skip,
        take: limit,
      });

    return {
      data: transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    };
  }

  // ── helpers ───────────────────────────────────────────────────────────────────

  private async getNepseStats(
    inv: Investment,
  ): Promise<InvestmentTransactionStats | undefined> {
    if (inv.type !== InvestmentTypeEnum.NEPSE) return undefined;
    const statsMap = await this.investmentTransactionsRepository.computeStatsForInvestments([
      inv.id,
    ]);
    return statsMap.get(inv.id);
  }

  // Cost basis of remaining shares for NEPSE (WAC method); stored investedAmount
  // for SIP/FD, or for a NEPSE row that has no transactions yet.
  private resolveInvestedAmount(inv: Investment, nepseStats?: InvestmentTransactionStats): number {
    if (inv.type === InvestmentTypeEnum.NEPSE && nepseStats) {
      return round2(nepseStats.remainingQuantity * nepseStats.averageBuyPrice);
    }
    return inv.investedAmount;
  }

  private enrichInvestment(inv: Investment, nepseStats?: InvestmentTransactionStats): EnrichedInvestment {
    const investedAmount = this.resolveInvestedAmount(inv, nepseStats);

    return {
      ...inv,
      investedAmount,
      unrealizedGainLoss:
        inv.currentValue !== null ? round2(inv.currentValue - investedAmount) : null,
      totalRealizedGainLoss: round2(nepseStats?.totalRealizedGainLoss ?? 0),
      ...(nepseStats && {
        remainingQuantity: nepseStats.remainingQuantity,
        averageBuyPrice: round2(nepseStats.averageBuyPrice),
      }),
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
