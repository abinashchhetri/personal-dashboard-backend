// src/playlists/repositories/playlist-track.repository.ts
// ─────────────────────────────────────────────────────────────────────────────
// PlaylistTrackRepository
// ─────────────────────────────────────────────────────────────────────────────
// Data access layer for the PlaylistTrack junction entity.
// Position-mutating methods (reorderAfterRemoval, shiftPositionsDown,
// shiftPositionsUp) accept an optional EntityManager so callers can pass
// qr.manager and keep all position changes on the same QueryRunner transaction.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { AbstractRepository } from 'src/common/database/abstract.repository';
import { PlaylistTrack } from '../entities/playlist-track.entity';

@Injectable()
export class PlaylistTrackRepository extends AbstractRepository<PlaylistTrack> {
  protected readonly logger = new Logger(PlaylistTrackRepository.name);

  constructor(
    @InjectRepository(PlaylistTrack)
    entityRepository: Repository<PlaylistTrack>,
    entityManager: EntityManager,
  ) {
    super(entityRepository, entityManager);
  }

  async findByPlaylist(playlistId: string): Promise<PlaylistTrack[]> {
    return this.entityRepository
      .createQueryBuilder('playlistTrack')
      .leftJoinAndSelect('playlistTrack.track', 'track')
      .where('playlistTrack.playlistId = :playlistId', { playlistId })
      .orderBy('playlistTrack.position', 'ASC')
      .getMany();
  }

  // Returns -1 when the playlist has no tracks so callers can do maxPosition + 1
  // for the next insert position without a special-case check.
  async getMaxPosition(playlistId: string): Promise<number> {
    const raw = await this.entityRepository
      .createQueryBuilder('pt')
      .select('MAX(pt.position)', 'maxPosition')
      .where('pt.playlistId = :playlistId', { playlistId })
      .getRawOne<{ maxPosition: string | null }>();

    return raw?.maxPosition !== null && raw?.maxPosition !== undefined
      ? Number(raw.maxPosition)
      : -1;
  }

  // Closes the gap left by a removed track — shifts all positions above the
  // removed slot down by 1. Must run inside the same QueryRunner as the DELETE.
  async reorderAfterRemoval(
    playlistId: string,
    removedPosition: number,
    manager?: EntityManager,
  ): Promise<void> {
    const qb = manager
      ? manager.createQueryBuilder()
      : this.entityRepository.createQueryBuilder();

    await qb
      .update(PlaylistTrack)
      .set({ position: () => 'position - 1' })
      .where('playlistId = :playlistId', { playlistId })
      .andWhere('position > :removedPosition', { removedPosition })
      .execute();
  }

  // Shifts tracks in [fromPosition, toPosition] DOWN by 1 (position - 1).
  // Used when moving a track forward: vacate the destination, then place the track.
  async shiftPositionsDown(
    playlistId: string,
    fromPosition: number,
    toPosition: number,
    manager?: EntityManager,
  ): Promise<void> {
    const qb = manager
      ? manager.createQueryBuilder()
      : this.entityRepository.createQueryBuilder();

    await qb
      .update(PlaylistTrack)
      .set({ position: () => 'position - 1' })
      .where('playlistId = :playlistId', { playlistId })
      .andWhere('position >= :fromPosition', { fromPosition })
      .andWhere('position <= :toPosition', { toPosition })
      .execute();
  }

  // Shifts tracks in [fromPosition, toPosition] UP by 1 (position + 1).
  // Used when moving a track backward: vacate the destination, then place the track.
  async shiftPositionsUp(
    playlistId: string,
    fromPosition: number,
    toPosition: number,
    manager?: EntityManager,
  ): Promise<void> {
    const qb = manager
      ? manager.createQueryBuilder()
      : this.entityRepository.createQueryBuilder();

    await qb
      .update(PlaylistTrack)
      .set({ position: () => 'position + 1' })
      .where('playlistId = :playlistId', { playlistId })
      .andWhere('position >= :fromPosition', { fromPosition })
      .andWhere('position <= :toPosition', { toPosition })
      .execute();
  }
}
