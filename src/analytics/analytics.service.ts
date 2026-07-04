import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Transaction } from 'src/transactions/entities/transaction.entity';
import { LineItem } from 'src/transactions/entities/line-item.entity';
import { Account } from 'src/accounts/entities/account.entity';
import { Investment } from 'src/investments/entities/investment.entity';
import { TransactionTypeEnum } from 'src/transactions/enums/transaction-type.enum';
import { DateRangeDto } from './dto/date-range.dto';
import { ItemTrendDto } from './dto/item-trend.dto';

// ── helpers ───────────────────────────────────────────────────────────────────

function resolveRange(dto: DateRangeDto): { start: Date; end: Date } {
  const now = new Date();
  // Use UTC month boundaries so the range is identical regardless of the
  // server's local timezone. Local Date constructors shift on machines that
  // are not UTC, causing e.g. July 1 00:00 IST to become June 30 in UTC and
  // exclude the entire first day of the month from the query.
  const start = dto.startDate
    ? new Date(dto.startDate)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const end = dto.endDate ? new Date(dto.endDate) : new Date();
  return { start, end };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── service ───────────────────────────────────────────────────────────────────

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(LineItem)
    private readonly lineItemRepo: Repository<LineItem>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(Investment)
    private readonly investmentRepo: Repository<Investment>,
  ) {}

  // ── dashboard ───────────────────────────────────────────────────────────────

  async getDashboard(userId: string, dto: DateRangeDto) {
    const { start, end } = resolveRange(dto);

    // Single scan: CASE WHEN splits expense vs income totals.
    // Quoted camelCase column names are required in raw SELECT expressions —
    // TypeORM only auto-translates property names inside WHERE/GROUP BY clauses.
    const raw = await this.transactionRepo
      .createQueryBuilder('t')
      .select(
        `COALESCE(SUM(CASE WHEN t.type = '${TransactionTypeEnum.EXPENSE}' THEN t."totalAmount" ELSE 0 END), 0)`,
        'totalSpent',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.type = '${TransactionTypeEnum.INCOME}' THEN t."totalAmount" ELSE 0 END), 0)`,
        'totalIncome',
      )
      .where('t.userId = :userId', { userId })
      .andWhere('t.isPersonal = :yes', { yes: true })
      .andWhere('t.transactedAt BETWEEN :start AND :end', { start, end })
      .getRawOne<{ totalSpent: string; totalIncome: string }>();

    const totalSpent = round2(Number(raw?.totalSpent ?? 0));
    const totalIncome = round2(Number(raw?.totalIncome ?? 0));
    const netSavings = round2(totalIncome - totalSpent);
    const savingsRate = totalIncome > 0 ? round2((netSavings / totalIncome) * 100) : 0;

    return { totalSpent, totalIncome, netSavings, savingsRate };
  }

  // ── category breakdown ───────────────────────────────────────────────────────

  async getCategoryBreakdown(userId: string, dto: DateRangeDto) {
    const { start, end } = resolveRange(dto);

    // Join line_items → transactions → categories. Group by categoryId so each
    // category (including null = uncategorised) gets one row.
    const rows = await this.lineItemRepo
      .createQueryBuilder('li')
      .innerJoin('li.transaction', 't')
      .leftJoin('li.category', 'c')
      .select("COALESCE(c.name, 'Uncategorized')", 'categoryName')
      .addSelect('SUM(li.amount)', 'total')
      .where('t.userId = :userId', { userId })
      .andWhere('t.isPersonal = :yes', { yes: true })
      .andWhere('t.type = :type', { type: TransactionTypeEnum.EXPENSE })
      .andWhere('t.transactedAt BETWEEN :start AND :end', { start, end })
      .groupBy('li.categoryId')
      .addGroupBy('c.name')
      .orderBy('total', 'DESC')
      .getRawMany<{ categoryName: string; total: string }>();

    const grandTotal = rows.reduce((sum, r) => sum + Number(r.total), 0);

    return rows.map((r) => ({
      categoryName: r.categoryName,
      total: round2(Number(r.total)),
      percentage: grandTotal > 0 ? round2((Number(r.total) / grandTotal) * 100) : 0,
    }));
  }

  // ── account-wise view ────────────────────────────────────────────────────────

  async getAccountWiseView(userId: string, dto: DateRangeDto) {
    const { start, end } = resolveRange(dto);

    const accounts = await this.accountRepo
      .createQueryBuilder('a')
      .where('a.userId = :userId', { userId })
      .andWhere('a.isArchived = :no', { no: false })
      .getMany();

    if (accounts.length === 0) return [];

    // Aggregate spend and count for the date range per account in a single query.
    const spendRows = await this.transactionRepo
      .createQueryBuilder('t')
      .select(`t."accountId"`, 'accountId')
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.type = '${TransactionTypeEnum.EXPENSE}' THEN t."totalAmount" ELSE 0 END), 0)`,
        'periodSpend',
      )
      .addSelect('COUNT(t.id)', 'transactionCount')
      .where('t.userId = :userId', { userId })
      .andWhere('t.isPersonal = :yes', { yes: true })
      .andWhere('t.transactedAt BETWEEN :start AND :end', { start, end })
      .groupBy(`t."accountId"`)
      .getRawMany<{ accountId: string; periodSpend: string; transactionCount: string }>();

    const spendMap = new Map(spendRows.map((r) => [r.accountId, r]));

    return accounts.map((acc) => {
      const agg = spendMap.get(acc.id);
      return {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        currentBalance: acc.currentBalance,
        periodSpend: round2(Number(agg?.periodSpend ?? 0)),
        transactionCount: Number(agg?.transactionCount ?? 0),
      };
    });
  }

  // ── top items ────────────────────────────────────────────────────────────────

  async getTopItems(userId: string, dto: DateRangeDto, limit: number) {
    const { start, end } = resolveRange(dto);
    const safeLimit = Math.min(Math.max(1, limit), 100);

    const rows = await this.lineItemRepo
      .createQueryBuilder('li')
      .innerJoin('li.transaction', 't')
      .select('LOWER(li.name)', 'itemName')
      .addSelect('SUM(li.amount)', 'total')
      .where('t.userId = :userId', { userId })
      .andWhere('t.isPersonal = :yes', { yes: true })
      .andWhere('t.type = :type', { type: TransactionTypeEnum.EXPENSE })
      .andWhere('t.transactedAt BETWEEN :start AND :end', { start, end })
      .groupBy('LOWER(li.name)')
      .orderBy('total', 'DESC')
      .limit(safeLimit)
      .getRawMany<{ itemName: string; total: string }>();

    return rows.map((r) => ({
      itemName: r.itemName,
      total: round2(Number(r.total)),
    }));
  }

  // ── item trend ───────────────────────────────────────────────────────────────

  async getItemTrend(userId: string, dto: ItemTrendDto) {
    const { start, end } = resolveRange(dto);

    // DATE_TRUNC bucket per month; LOWER() on both sides for case-insensitive match.
    const rows = await this.lineItemRepo
      .createQueryBuilder('li')
      .innerJoin('li.transaction', 't')
      .select(`DATE_TRUNC('month', t."transactedAt")`, 'month')
      .addSelect('SUM(li.amount)', 'total')
      .where('t.userId = :userId', { userId })
      .andWhere('t.isPersonal = :yes', { yes: true })
      .andWhere('t.type = :type', { type: TransactionTypeEnum.EXPENSE })
      .andWhere('LOWER(li.name) = LOWER(:itemName)', { itemName: dto.itemName })
      .andWhere('t.transactedAt BETWEEN :start AND :end', { start, end })
      .groupBy(`DATE_TRUNC('month', t."transactedAt")`)
      .orderBy('month', 'ASC')
      .getRawMany<{ month: string | Date; total: string }>();

    return rows.map((r) => ({
      // Normalise to YYYY-MM for charting — DATE_TRUNC returns a full timestamp.
      month: new Date(r.month).toISOString().slice(0, 7),
      total: round2(Number(r.total)),
    }));
  }

  // ── recent transactions ──────────────────────────────────────────────────────

  async getRecentTransactions(userId: string, limit: number = 5): Promise<Transaction[]> {
    const safeLimit = Math.min(Math.max(1, limit), 10);

    return this.transactionRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.lineItems', 'lineItems')
      .where('t.userId = :userId', { userId })
      .andWhere('t.isPersonal = :yes', { yes: true })
      .orderBy('t.transactedAt', 'DESC')
      .take(safeLimit)
      .getMany();
  }

  // ── net worth ────────────────────────────────────────────────────────────────

  async getNetWorth(userId: string) {
    const [accRaw, invRaw] = await Promise.all([
      this.accountRepo
        .createQueryBuilder('a')
        .select(`COALESCE(SUM(a."currentBalance"), 0)`, 'totalBalance')
        .where('a.userId = :userId', { userId })
        .andWhere('a.isArchived = :no', { no: false })
        .getRawOne<{ totalBalance: string }>(),

      // Treat null currentValue as investedAmount (at-cost assumption).
      this.investmentRepo
        .createQueryBuilder('inv')
        .select(
          `COALESCE(SUM(COALESCE(inv."currentValue", inv."investedAmount")), 0)`,
          'totalInvestmentValue',
        )
        .where('inv.userId = :userId', { userId })
        .andWhere('inv.isActive = :yes', { yes: true })
        .getRawOne<{ totalInvestmentValue: string }>(),
    ]);

    const totalBalance = round2(Number(accRaw?.totalBalance ?? 0));
    const totalInvestmentValue = round2(Number(invRaw?.totalInvestmentValue ?? 0));
    const netWorth = round2(totalBalance + totalInvestmentValue);

    return { totalBalance, totalInvestmentValue, netWorth };
  }
}
