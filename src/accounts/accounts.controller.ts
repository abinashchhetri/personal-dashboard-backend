// src/accounts/accounts.controller.ts
// ─────────────────────────────────────────────────────────────────────────────
// AccountsController
// ─────────────────────────────────────────────────────────────────────────────
// HTTP handlers for the /accounts route group.
// Every route is scoped to the authenticated user — userId comes from the JWT,
// never from the request body or params.
// ─────────────────────────────────────────────────────────────────────────────

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

import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { FindAllAccountsDto } from './dto/find-all-accounts.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new account (cash, bank, eSewa, Khalti)' })
  create(
    @Body() createAccountDto: CreateAccountDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.accountsService.create(createAccountDto, payload.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all accounts for the authenticated user' })
  findAll(
    @Query() findAllAccountsDto: FindAllAccountsDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.accountsService.findAll(findAllAccountsDto, payload.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single account by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() payload: IPayload,
  ) {
    return this.accountsService.findOne(id, payload.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update account name, default status, or archive it' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAccountDto: UpdateAccountDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.accountsService.update(id, updateAccountDto, payload.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an account (only allowed if it has no transaction history)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() payload: IPayload,
  ) {
    return this.accountsService.remove(id, payload.id);
  }
}
