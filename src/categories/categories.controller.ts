// src/categories/categories.controller.ts
// ─────────────────────────────────────────────────────────────────────────────
// CategoriesController
// ─────────────────────────────────────────────────────────────────────────────
// HTTP handlers for the /categories route group.
// GET routes return system + user's custom categories.
// Mutations (POST / PATCH / DELETE) are blocked on system categories by the service.
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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from 'src/common/decorators';
import { IPayload } from 'src/common/interfaces';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a custom category' })
  create(
    @Body() createCategoryDto: CreateCategoryDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.categoriesService.create(createCategoryDto, payload.id);
  }

  @Get()
  @ApiOperation({ summary: 'List system categories + current user custom categories' })
  findAll(@CurrentUser() payload: IPayload) {
    return this.categoriesService.findAll(payload.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single category by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a custom category (system categories are immutable)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.categoriesService.update(id, updateCategoryDto, payload.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a custom category (system categories are immutable)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() payload: IPayload,
  ) {
    return this.categoriesService.remove(id, payload.id);
  }
}
