import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { AbstractRepository } from 'src/common/database/abstract.repository';
import { Transfer } from '../entities/transfer.entity';
import { FindAllTransfersDto } from '../dto/find-all-transfers.dto';

@Injectable()
export class TransfersRepository extends AbstractRepository<Transfer> {
  protected readonly logger = new Logger(TransfersRepository.name);

  constructor(
    @InjectRepository(Transfer)
    entityRepository: Repository<Transfer>,
    entityManager: EntityManager,
  ) {
    super(entityRepository, entityManager);
  }

  async findAllForUser(
    userId: string,
    filters: FindAllTransfersDto,
    pagination: { skip: number; take: number },
  ): Promise<[Transfer[], number]> {
    const { accountId, startDate, endDate } = filters;

    const qb = this.entityRepository
      .createQueryBuilder('transfer')
      .leftJoinAndSelect('transfer.fromAccount', 'fromAccount')
      .leftJoinAndSelect('transfer.toAccount', 'toAccount')
      .where('transfer.userId = :userId', { userId });

    if (accountId) {
      // Match transfers involving this account on either side.
      qb.andWhere(
        '(transfer.fromAccountId = :accountId OR transfer.toAccountId = :accountId)',
        { accountId },
      );
    }
    if (startDate) {
      qb.andWhere('transfer.transactedAt >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('transfer.transactedAt <= :endDate', { endDate });
    }

    return qb
      .orderBy('transfer.transactedAt', 'DESC')
      .addOrderBy('transfer.createdAt', 'DESC')
      .skip(pagination.skip)
      .take(pagination.take)
      .getManyAndCount();
  }
}
