// src/playlists/playlists.module.ts
// ─────────────────────────────────────────────────────────────────────────────
// PlaylistsModule
// ─────────────────────────────────────────────────────────────────────────────
// Registers the full playlist feature: repositories, service, and HTTP controller.
// PlaylistsService uses DataSource directly to query Track entities (registered in
// MusicModule) without creating a circular module dependency.
// ─────────────────────────────────────────────────────────────────────────────

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PlaylistTrack } from './entities/playlist-track.entity';
import { Playlist } from './entities/playlist.entity';
import { PlaylistsController } from './playlists.controller';
import { PlaylistsService } from './playlists.service';
import { PlaylistTrackRepository } from './repositories/playlist-track.repository';
import { PlaylistRepository } from './repositories/playlist.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Playlist, PlaylistTrack])],
  controllers: [PlaylistsController],
  providers: [PlaylistRepository, PlaylistTrackRepository, PlaylistsService],
  exports: [PlaylistsService],
})
export class PlaylistsModule {}
