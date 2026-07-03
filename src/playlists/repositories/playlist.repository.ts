// src/playlists/repositories/playlist.repository.ts
// ─────────────────────────────────────────────────────────────────────────────
// PlaylistRepository
// ─────────────────────────────────────────────────────────────────────────────
// Data access layer for the Playlist entity.
// findOneForUser returns null on userId mismatch as well as not-found — callers
// must never receive another user's playlist regardless of the reason.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { AbstractRepository } from 'src/common/database/abstract.repository';
import { Playlist } from '../entities/playlist.entity';

@Injectable()
export class PlaylistRepository extends AbstractRepository<Playlist> {
  protected readonly logger = new Logger(PlaylistRepository.name);

  constructor(
    @InjectRepository(Playlist)
    entityRepository: Repository<Playlist>,
    entityManager: EntityManager,
  ) {
    super(entityRepository, entityManager);
  }

  async findAllForUser(userId: string): Promise<Playlist[]> {
    return this.entityRepository
      .createQueryBuilder('playlist')
      .where('playlist.userId = :userId', { userId })
      .andWhere('playlist.isActive = true')
      .orderBy('playlist.createdAt', 'DESC')
      .getMany();
  }

  // Returns null on not-found AND on userId mismatch — never leaks another
  // user's playlist with a 404 fallthrough.
  async findOneForUser(playlistId: string, userId: string): Promise<Playlist | null> {
    return this.entityRepository.findOne({
      where: { id: playlistId, userId },
    });
  }
}
