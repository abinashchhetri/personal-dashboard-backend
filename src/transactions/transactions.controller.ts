import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from 'src/common/decorators';
import { IPayload } from 'src/common/interfaces';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { OnboardingGuard } from 'src/common/guards';

import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { FindAllTransactionsDto } from './dto/find-all-transactions.dto';
import { DuplicateCheckDto } from './dto/duplicate-check.dto';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, OnboardingGuard)
  @ApiOperation({ summary: 'Log a new transaction (expense, income, or in_transit)' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Client-generated key; identical key returns the existing transaction instead of creating a duplicate.',
  })
  create(
    @Body() createTransactionDto: CreateTransactionDto,
    @CurrentUser() payload: IPayload,
    @Headers('Idempotency-Key') idempotencyKey?: string,
  ) {
    return this.transactionsService.create(
      createTransactionDto,
      payload.id,
      idempotencyKey || undefined,
    );
  }

  // ── Static routes BEFORE /:id ─────────────────────────────────────────────

  @Get('duplicate-check')
  @ApiOperation({
    summary: 'Advisory duplicate check — returns likelyDuplicate:true if a same-account same-amount transaction exists within the window',
  })
  duplicateCheck(
    @Query() dto: DuplicateCheckDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.transactionsService.duplicateCheck(dto, payload.id);
  }

  @Get('trash')
  @ApiOperation({ summary: 'List soft-deleted transactions for the current user' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  findTrash(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @CurrentUser() payload: IPayload,
  ) {
    return this.transactionsService.findTrash(payload.id, page, limit);
  }

  // ── Collection + single-resource routes ───────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List transactions for the current user (paginated, filterable)' })
  findAll(
    @Query() dto: FindAllTransactionsDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.transactionsService.findAll(dto, payload.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single transaction with its line items' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() payload: IPayload,
  ) {
    return this.transactionsService.findOne(id, payload.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update note, categoryId, merchant, or tags of a transaction' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.transactionsService.update(id, updateTransactionDto, payload.id);
  }

  // Soft-delete — sets deletedAt and reverses balance. Returns the same shape
  // as before so existing callers are unaffected.
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a transaction (moves to trash, reverses balance)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() payload: IPayload,
  ) {
    return this.transactionsService.remove(id, payload.id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a trashed transaction and re-apply its balance effect' })
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() payload: IPayload,
  ) {
    return this.transactionsService.restore(id, payload.id);
  }

  @Delete(':id/permanent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete a trashed transaction (irreversible)' })
  permanentDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() payload: IPayload,
  ) {
    return this.transactionsService.permanentDelete(id, payload.id);
  }
}
