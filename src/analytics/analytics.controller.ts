import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from 'src/common/decorators';
import { IPayload } from 'src/common/interfaces';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

import { AnalyticsService } from './analytics.service';
import { DateRangeDto } from './dto/date-range.dto';
import { ItemTrendDto } from './dto/item-trend.dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Monthly dashboard: totalSpent, totalIncome, netSavings, savingsRate' })
  getDashboard(
    @Query() dto: DateRangeDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.analyticsService.getDashboard(payload.id, dto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Expense category breakdown with totals and percentages' })
  getCategoryBreakdown(
    @Query() dto: DateRangeDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.analyticsService.getCategoryBreakdown(payload.id, dto);
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Per-account balance and spend for the date range' })
  getAccountWiseView(
    @Query() dto: DateRangeDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.analyticsService.getAccountWiseView(payload.id, dto);
  }

  @Get('top-items')
  @ApiOperation({ summary: 'Top N most-spent-on line item names for the date range' })
  @ApiQuery({ name: 'limit', required: false, example: 10, description: 'Max 100' })
  getTopItems(
    @Query() dto: DateRangeDto,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @CurrentUser() payload: IPayload,
  ) {
    return this.analyticsService.getTopItems(payload.id, dto, limit);
  }

  @Get('item-trend')
  @ApiOperation({ summary: 'Monthly spend trend for a specific item name' })
  getItemTrend(
    @Query() dto: ItemTrendDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.analyticsService.getItemTrend(payload.id, dto);
  }

  @Get('recent-transactions')
  @ApiOperation({ summary: 'Recent personal transactions for the dashboard activity feed' })
  @ApiQuery({ name: 'limit', required: false, example: 5, description: 'Number of transactions (max 10, default 5)' })
  getRecentTransactions(
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
    @CurrentUser() payload: IPayload,
  ) {
    return this.analyticsService.getRecentTransactions(payload.id, limit);
  }

  @Get('net-worth')
  @ApiOperation({ summary: 'Net worth: account balances + investment values' })
  getNetWorth(@CurrentUser() payload: IPayload) {
    return this.analyticsService.getNetWorth(payload.id);
  }
}
