// src/playlists/playlists.controller.ts
// ─────────────────────────────────────────────────────────────────────────────
// PlaylistsController
// ─────────────────────────────────────────────────────────────────────────────
// Route order: PATCH /:id/tracks/reorder is declared BEFORE
// DELETE /:id/tracks/:trackId to prevent NestJS routing from matching
// the literal 'reorder' segment as a :trackId param.
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

import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators';
import { IPayload } from 'src/common/interfaces';

import { AddTrackDto } from './dto/add-track.dto';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { ReorderTracksDto } from './dto/reorder-tracks.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { PlaylistsService } from './playlists.service';

@ApiTags('Playlists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('playlists')
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new playlist' })
  create(@Body() dto: CreatePlaylistDto, @CurrentUser() payload: IPayload) {
    return this.playlistsService.create(payload.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all playlists for the current user' })
  findAll(@CurrentUser() payload: IPayload) {
    return this.playlistsService.findAll(payload.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single playlist with its ordered tracks' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() payload: IPayload) {
    return this.playlistsService.findOne(id, payload.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update playlist name, description, or cover image' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlaylistDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.playlistsService.update(id, payload.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a playlist and all its track associations' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() payload: IPayload) {
    return this.playlistsService.remove(id, payload.id);
  }

  @Post(':id/tracks')
  @ApiOperation({ summary: 'Add a cached track to a playlist at a given position (appends if omitted)' })
  addTrack(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTrackDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.playlistsService.addTrack(id, payload.id, dto);
  }

  // MUST be declared before DELETE /:id/tracks/:trackId — otherwise NestJS
  // would try to match 'reorder' as a :trackId UUID and fail.
  @Patch(':id/tracks/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move a track to a new position within the playlist' })
  reorderTrack(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderTracksDto,
    @CurrentUser() payload: IPayload,
  ) {
    return this.playlistsService.reorderTrack(id, payload.id, dto);
  }

  @Delete(':id/tracks/:trackId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a track from a playlist and close the position gap' })
  removeTrack(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @CurrentUser() payload: IPayload,
  ) {
    return this.playlistsService.removeTrack(id, payload.id, trackId);
  }
}
