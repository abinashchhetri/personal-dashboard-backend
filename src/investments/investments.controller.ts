import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from 'src/common/decorators';
import { IPayload } from 'src/common/interfaces';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PaginationQueryDto } from 'src/common/dtos/pagination.dto';

import { InvestmentsService } from './investments.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { FindAllInvestmentsDto } from './dto/find-all-investments.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@ApiTags('Investments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('investments')
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Add a new investment (NEPSE, SIP, or FD)' })
  create(
    @Body() dto: CreateInvestmentDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.investmentsService.create(dto, payload.id);
  }

  @Get()
  @ApiOperation({ summary: 'List investments (paginated, filterable by type and status)' })
  findAll(
    @Query() dto: FindAllInvestmentsDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.investmentsService.findAll(dto, payload.id);
  }

  // 'summary' must be declared before ':id' so Express does not treat the
  // literal string "summary" as a UUID parameter.
  @Get('summary')
  @ApiOperation({ summary: 'Portfolio summary: total invested, current value, gain/loss by type' })
  getPortfolioSummary(@CurrentUser() payload: IPayload) {
    return this.investmentsService.getPortfolioSummary(payload.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single investment by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() payload: IPayload,
  ) {
    return this.investmentsService.findOne(id, payload.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update current value (triggers history snapshot), metadata, or active status' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvestmentDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.investmentsService.update(id, dto, payload.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an investment and all its value history' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() payload: IPayload,
  ) {
    return this.investmentsService.remove(id, payload.id);
  }

  @Post(':id/transactions')
  @ApiOperation({ summary: 'Record a NEPSE buy or sell transaction' })
  createTransaction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTransactionDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.investmentsService.createTransaction(id, dto, payload.id);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'List buy/sell transactions for a NEPSE investment (paginated, newest first)' })
  listTransactions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() dto: PaginationQueryDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.investmentsService.listTransactions(id, payload.id, dto);
  }
}
