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

import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { FindAllTransactionsDto } from './dto/find-all-transactions.dto';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Log a new transaction (expense, income, or in_transit)' })
  create(
    @Body() createTransactionDto: CreateTransactionDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.transactionsService.create(createTransactionDto, payload.id);
  }

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
  @ApiOperation({ summary: 'Update note or category of a transaction' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.transactionsService.update(id, updateTransactionDto, payload.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a transaction and reverse its balance effect' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() payload: IPayload,
  ) {
    return this.transactionsService.remove(id, payload.id);
  }
}
