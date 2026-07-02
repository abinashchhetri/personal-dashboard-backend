import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from 'src/common/decorators';
import { IPayload } from 'src/common/interfaces';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { FindAllTransfersDto } from './dto/find-all-transfers.dto';

@ApiTags('Transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @ApiOperation({ summary: 'Move money between two of your accounts' })
  create(
    @Body() createTransferDto: CreateTransferDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.transfersService.create(createTransferDto, payload.id);
  }

  @Get()
  @ApiOperation({ summary: 'List transfers for the current user (paginated, filterable)' })
  findAll(
    @Query() dto: FindAllTransfersDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.transfersService.findAll(dto, payload.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single transfer by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() payload: IPayload,
  ) {
    return this.transfersService.findOne(id, payload.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a transfer and reverse both account balance effects' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() payload: IPayload,
  ) {
    return this.transfersService.remove(id, payload.id);
  }
}
