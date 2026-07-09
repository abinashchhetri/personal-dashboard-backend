// src/workout/workout.controller.ts
// ─────────────────────────────────────────────────────────────────────────────
// WorkoutController
// ─────────────────────────────────────────────────────────────────────────────
// HTTP handlers for the /workout route group.
// Static routes (plan, plan/day/:day, sessions/today) are declared before any
// :id/bare-param route so Express never mistakes a literal segment for a param.
// ─────────────────────────────────────────────────────────────────────────────

import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from 'src/common/decorators';
import { IPayload } from 'src/common/interfaces';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

import { WorkoutPlanService } from './services/workout-plan.service';
import { WorkoutSessionService } from './services/workout-session.service';
import { DayOfWeekEnum } from './enums/day-of-week.enum';
import { ImportWorkoutPlanDto } from './dto/import-workout-plan.dto';
import { CreateWorkoutSessionDto } from './dto/create-workout-session.dto';
import { LogSessionSetDto } from './dto/log-session-set.dto';
import { AddSetDto } from './dto/add-set.dto';
import { FindWorkoutSessionsDto } from './dto/find-workout-sessions.dto';

@ApiTags('Workout')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workout')
export class WorkoutController {
  constructor(
    private readonly workoutPlanService: WorkoutPlanService,
    private readonly workoutSessionService: WorkoutSessionService,
  ) {}

  // ── Plan ─────────────────────────────────────────────────────────────────

  @Post('plan/import')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import a workout plan from a CSV file (replaces the active plan)' })
  importPlan(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportWorkoutPlanDto,
    @CurrentUser() payload: IPayload,
  ) {
    if (!file) {
      throw new BadRequestException('CSV file is required (field name: "file")');
    }
    const isCsv =
      file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv');
    if (!isCsv) {
      throw new BadRequestException('Only .csv files are accepted');
    }

    const csv = file.buffer.toString('utf-8');
    return this.workoutPlanService.importPlan(payload.id, csv, dto.planName);
  }

  @Get('plan')
  @ApiOperation({ summary: 'Get the active workout plan' })
  getActivePlan(@CurrentUser() payload: IPayload) {
    return this.workoutPlanService.getActivePlan(payload.id);
  }

  @Get('plan/day/:day')
  @ApiOperation({ summary: 'Get the active plan\'s exercises for one weekday, grouped by body part' })
  getPlanForDay(@Param('day') day: string, @CurrentUser() payload: IPayload) {
    const validDay = Object.values(DayOfWeekEnum).find(
      (d) => d.toLowerCase() === day.toLowerCase(),
    );
    if (!validDay) {
      throw new BadRequestException(
        `Invalid day '${day}' — expected one of ${Object.values(DayOfWeekEnum).join(', ')}`,
      );
    }
    return this.workoutPlanService.getPlanForDay(payload.id, validDay);
  }

  @Delete('plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate the current workout plan' })
  deactivatePlan(@CurrentUser() payload: IPayload) {
    return this.workoutPlanService.deactivatePlan(payload.id);
  }

  // ── Sessions ─────────────────────────────────────────────────────────────

  @Post('sessions')
  @ApiOperation({ summary: 'Start a new workout session for a date (pre-populates sets from the active plan)' })
  startSession(
    @Body() dto: CreateWorkoutSessionDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.workoutSessionService.startSession(payload.id, dto.sessionDate);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List workout sessions (paginated, date range filter)' })
  findSessions(
    @Query() dto: FindWorkoutSessionsDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.workoutSessionService.findSessions(payload.id, dto);
  }

  @Get('sessions/today')
  @ApiOperation({ summary: "Get today's session, or null if none has been started" })
  getTodaySession(@CurrentUser() payload: IPayload) {
    return this.workoutSessionService.getTodaySession(payload.id);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get a session with all its sets, grouped by exercise' })
  getSessionWithSets(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() payload: IPayload,
  ) {
    return this.workoutSessionService.getSessionWithSets(payload.id, id);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a workout session (e.g. one started before an active plan existed)' })
  removeSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() payload: IPayload,
  ) {
    return this.workoutSessionService.removeSession(payload.id, id);
  }

  @Post('sessions/:id/sets')
  @ApiOperation({ summary: 'Log or update one set within a session' })
  logSet(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LogSessionSetDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.workoutSessionService.logSet(payload.id, id, dto);
  }

  @Post('sessions/:id/sets/add')
  @ApiOperation({ summary: 'Add a new set for an exercise beyond the plan' })
  addSet(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddSetDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.workoutSessionService.addSet(payload.id, id, dto);
  }

  @Delete('sessions/:id/sets/:setId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a specific set from a session' })
  removeSet(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('setId', ParseUUIDPipe) setId: string,
    @CurrentUser() payload: IPayload,
  ) {
    return this.workoutSessionService.removeSet(payload.id, id, setId);
  }

  @Post('sessions/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a session as complete' })
  completeSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() payload: IPayload,
  ) {
    return this.workoutSessionService.completeSession(payload.id, id);
  }

  // ── Progress ─────────────────────────────────────────────────────────────

  @Get('progress/:exerciseName')
  @ApiOperation({ summary: 'Progress chart data (max weight per session) for one exercise' })
  getProgress(
    @Param('exerciseName') exerciseName: string,
    @CurrentUser() payload: IPayload,
  ) {
    return this.workoutSessionService.getProgressForExercise(
      payload.id,
      decodeURIComponent(exerciseName),
    );
  }
}
