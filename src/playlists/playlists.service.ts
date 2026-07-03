// src/playlists/playlists.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// PlaylistsService
// ─────────────────────────────────────────────────────────────────────────────
// All mutating operations that touch both playlists and playlist_tracks run
// inside a QueryRunner so trackCount and position arrays stay in sync even if
// the process crashes between the two writes.
// ─────────────────────────────────────────────────────────────────────────────

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { Track } from 'src/music/entities/track.entity';

import { AddTrackDto } from './dto/add-track.dto';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { ReorderTracksDto } from './dto/reorder-tracks.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { Playlist } from './entities/playlist.entity';
import { PlaylistTrack } from './entities/playlist-track.entity';
import { PlaylistRepository } from './repositories/playlist.repository';
import { PlaylistTrackRepository } from './repositories/playlist-track.repository';

@Injectable()
export class PlaylistsService {
  constructor(
    private readonly playlistRepository: PlaylistRepository,
    private readonly playlistTrackRepository: PlaylistTrackRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async create(userId: string, dto: CreatePlaylistDto): Promise<Playlist> {
    const playlist = this.dataSource.manager.create(Playlist, {
      userId,
      name: dto.name,
      description: dto.description ?? null,
      coverUrl: dto.coverUrl ?? null,
      isActive: true,
      trackCount: 0,
    });
    return this.dataSource.manager.save(Playlist, playlist);
  }

  async findAll(userId: string): Promise<Playlist[]> {
    return this.playlistRepository.findAllForUser(userId);
  }

  async findOne(id: string, userId: string): Promise<Playlist> {
    const playlist = await this.playlistRepository.findOneForUser(id, userId);
    if (!playlist) throw new NotFoundException('Playlist not found');

    const playlistTracks = await this.playlistTrackRepository.findByPlaylist(id);
    playlist.tracks = playlistTracks.map((pt) => pt.track);
    return playlist;
  }

  async update(id: string, userId: string, dto: UpdatePlaylistDto): Promise<Playlist> {
    const playlist = await this.playlistRepository.findOneForUser(id, userId);
    if (!playlist) throw new NotFoundException('Playlist not found');

    await this.playlistRepository.findOneAndUpdate({ id } as any, dto as any);
    return this.playlistRepository.findOne({ id } as any);
  }

  async remove(id: string, userId: string): Promise<void> {
    const playlist = await this.playlistRepository.findOneForUser(id, userId);
    if (!playlist) throw new NotFoundException('Playlist not found');
    await this.playlistRepository.findOneAndDelete({ id } as any);
  }

  async addTrack(playlistId: string, userId: string, dto: AddTrackDto): Promise<PlaylistTrack> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // a. Verify ownership — never reveal another user's playlist ID exists.
      const playlist = await qr.manager.findOne(Playlist, { where: { id: playlistId, userId } });
      if (!playlist) throw new NotFoundException('Playlist not found');

      // b. Track must exist and be fully cached — uncached tracks cannot be played.
      const track = await qr.manager.findOne(Track, { where: { id: dto.trackId } });
      if (!track) throw new NotFoundException('Track not found');
      if (!track.isCached) {
        throw new BadRequestException(
          'Track must be fully cached before adding to a playlist. Wait for caching to complete.',
        );
      }

      // c. Reject duplicates — unique constraint (playlistId, trackId) enforces this in DB too.
      const duplicate = await qr.manager.findOne(PlaylistTrack, {
        where: { playlistId, trackId: dto.trackId },
      });
      if (duplicate) throw new ConflictException('Track is already in this playlist');

      // d. Determine position — explicit or append-to-end.
      let position: number;
      if (dto.position !== undefined) {
        position = dto.position;
      } else {
        const rawMax = await qr.manager
          .createQueryBuilder()
          .select('MAX(pt.position)', 'maxPos')
          .from(PlaylistTrack, 'pt')
          .where('pt.playlistId = :playlistId', { playlistId })
          .getRawOne<{ maxPos: string | null }>();
        const maxPos =
          rawMax?.maxPos !== null && rawMax?.maxPos !== undefined ? Number(rawMax.maxPos) : -1;
        position = maxPos + 1;
      }

      // e. Insert the junction row.
      const pt = qr.manager.create(PlaylistTrack, { playlistId, trackId: dto.trackId, position });
      const saved = await qr.manager.save(PlaylistTrack, pt);

      // f. Increment denormalised counter — same transaction, never a separate operation.
      await qr.manager
        .createQueryBuilder()
        .update(Playlist)
        .set({ trackCount: () => '"trackCount" + 1' })
        .where('id = :id', { id: playlistId })
        .execute();

      await qr.commitTransaction();
      return saved;
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  async removeTrack(playlistId: string, userId: string, trackId: string): Promise<void> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // a. Verify ownership.
      const playlist = await qr.manager.findOne(Playlist, { where: { id: playlistId, userId } });
      if (!playlist) throw new NotFoundException('Playlist not found');

      // b. Locate the junction row.
      const pt = await qr.manager.findOne(PlaylistTrack, { where: { playlistId, trackId } });
      if (!pt) throw new NotFoundException('Track not found in playlist');

      // c. Save position before deletion for the gap-closure step below.
      const removedPosition = pt.position;

      // d. Delete the junction row.
      await qr.manager.delete(PlaylistTrack, { id: pt.id });

      // e. Close the gap — shift all positions above the removed slot down by 1.
      await this.playlistTrackRepository.reorderAfterRemoval(playlistId, removedPosition, qr.manager);

      // f. Decrement denormalised counter — same transaction.
      await qr.manager
        .createQueryBuilder()
        .update(Playlist)
        .set({ trackCount: () => '"trackCount" - 1' })
        .where('id = :id', { id: playlistId })
        .execute();

      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  async reorderTrack(playlistId: string, userId: string, dto: ReorderTracksDto): Promise<void> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // a. Verify ownership.
      const playlist = await qr.manager.findOne(Playlist, { where: { id: playlistId, userId } });
      if (!playlist) throw new NotFoundException('Playlist not found');

      // b. Locate the junction row to be moved.
      const pt = await qr.manager.findOne(PlaylistTrack, {
        where: { playlistId, trackId: dto.trackId },
      });
      if (!pt) throw new NotFoundException('Track not found in playlist');

      const currentPosition = pt.position;
      const totalTracks = playlist.trackCount;

      // e. Validate range.
      if (dto.newPosition < 0 || dto.newPosition >= totalTracks) {
        throw new BadRequestException(
          `Position must be between 0 and ${totalTracks - 1}`,
        );
      }

      // f. No-op — early commit, nothing changed.
      if (dto.newPosition === currentPosition) {
        await qr.commitTransaction();
        return;
      }

      if (dto.newPosition > currentPosition) {
        // g. Moving forward: shift the tracks between [current+1, newPos] down by 1.
        await this.playlistTrackRepository.shiftPositionsDown(
          playlistId,
          currentPosition + 1,
          dto.newPosition,
          qr.manager,
        );
      } else {
        // h. Moving backward: shift the tracks between [newPos, current-1] up by 1.
        await this.playlistTrackRepository.shiftPositionsUp(
          playlistId,
          dto.newPosition,
          currentPosition - 1,
          qr.manager,
        );
      }

      // i. Place the track at its new position.
      await qr.manager
        .createQueryBuilder()
        .update(PlaylistTrack)
        .set({ position: dto.newPosition })
        .where('id = :id', { id: pt.id })
        .execute();

      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }
}
