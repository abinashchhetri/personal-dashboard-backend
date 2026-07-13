// src/meals/meals.controller.ts
// ─────────────────────────────────────────────────────────────────────────────
// MealsController
// ─────────────────────────────────────────────────────────────────────────────
// HTTP handlers for the /meals route group.
// POST /meals/prep/:id/consume is declared before PATCH/DELETE /meals/prep/:id
// so "consume" is never mistaken for a UUID param.
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

import { MealsService } from './meals.service';
import { ImportMealPlanDto } from './dto/import-plan.dto';
import { CreateMealLogDto } from './dto/create-meal-log.dto';
import { UpdateMealLogDto } from './dto/update-meal-log.dto';
import { FindLogsDto } from './dto/find-logs.dto';
import { CreatePrepDto } from './dto/create-prep.dto';
import { UpdatePrepDto } from './dto/update-prep.dto';
import { ConsumePrepDto } from './dto/consume-prep.dto';

@ApiTags('Meals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meals')
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  // ── Plan ─────────────────────────────────────────────────────────────────

  @Post('plan/import')
  @ApiOperation({ summary: 'Replace the weekly meal plan from a CSV (day,meal,name,calories,protein,carbs,fat,notes)' })
  importPlan(@Body() dto: ImportMealPlanDto, @CurrentUser() payload: IPayload) {
    return this.mealsService.importPlan(dto.csv, payload.id);
  }

  @Get('plan')
  @ApiOperation({ summary: 'Get the weekly meal plan grouped by day' })
  getPlan(@CurrentUser() payload: IPayload) {
    return this.mealsService.getPlan(payload.id);
  }

  @Delete('plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear the entire meal plan' })
  clearPlan(@CurrentUser() payload: IPayload) {
    return this.mealsService.clearPlan(payload.id);
  }

  // ── Today (static — before /logs/:id and /prep/:id) ─────────────────────

  @Get('today')
  @ApiOperation({ summary: "Get today's planned meals, logged meals, and active prep batches" })
  getToday(@CurrentUser() payload: IPayload) {
    return this.mealsService.getToday(payload.id);
  }

  // ── Meal logs ────────────────────────────────────────────────────────────

  @Post('logs')
  @ApiOperation({ summary: 'Log a meal (on-plan or free-form)' })
  createLog(@Body() dto: CreateMealLogDto, @CurrentUser() payload: IPayload) {
    return this.mealsService.createLog(dto, payload.id);
  }

  @Get('logs')
  @ApiOperation({ summary: 'List logged meals (paginated)' })
  findLogs(@Query() dto: FindLogsDto, @CurrentUser() payload: IPayload) {
    return this.mealsService.findLogs(dto, payload.id);
  }

  @Patch('logs/:id')
  @ApiOperation({ summary: 'Update a meal log' })
  updateLog(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMealLogDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.mealsService.updateLog(id, dto, payload.id);
  }

  @Delete('logs/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a meal log' })
  removeLog(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() payload: IPayload,
  ) {
    return this.mealsService.removeLog(id, payload.id);
  }

  // ── Meal prep ────────────────────────────────────────────────────────────

  @Post('prep')
  @ApiOperation({ summary: 'Create a meal-prep batch (e.g. "5 lunches prepped on Sunday")' })
  createPrep(@Body() dto: CreatePrepDto, @CurrentUser() payload: IPayload) {
    return this.mealsService.createPrep(dto, payload.id);
  }

  @Get('prep')
  @ApiOperation({ summary: 'List active meal-prep batches (portions remaining)' })
  findPrep(@CurrentUser() payload: IPayload) {
    return this.mealsService.findPrep(payload.id);
  }

  @Post('prep/:id/consume')
  @ApiOperation({ summary: 'Consume one portion from a prep batch — atomically logs the meal too' })
  consumePortion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConsumePrepDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.mealsService.consumePortion(id, dto, payload.id);
  }

  @Patch('prep/:id')
  @ApiOperation({ summary: 'Update a meal-prep batch' })
  updatePrep(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePrepDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.mealsService.updatePrep(id, dto, payload.id);
  }

  @Delete('prep/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a meal-prep batch' })
  removePrep(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() payload: IPayload,
  ) {
    return this.mealsService.removePrep(id, payload.id);
  }
}
