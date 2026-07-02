import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { AbstractRepository } from 'src/common/database/abstract.repository';
import { Investment } from '../entities/investment.entity';
import { InvestmentHistory } from '../entities/investment-history.entity';
import { FindAllInvestmentsDto } from '../dto/find-all-investments.dto';

@Injectable()
export class InvestmentsRepository extends AbstractRepository<Investment> {
  protected readonly logger = new Logger(InvestmentsRepository.name);

  constructor(
    @InjectRepository(Investment)
    entityRepository: Repository<Investment>,
    entityManager: EntityManager,
  ) {
    super(entityRepository, entityManager);
  }

  async createInvestment(data: Partial<Investment>): Promise<Investment> {
    const investment = this.entityRepository.create(data);
    return this.entityRepository.save(investment);
  }

  async findAllForUser(
    userId: string,
    filters: FindAllInvestmentsDto,
    pagination: { skip: number; take: number },
  ): Promise<[Investment[], number]> {
    const { type, isActive } = filters;

    const qb = this.entityRepository
      .createQueryBuilder('investment')
      .where('investment.userId = :userId', { userId });

    if (type) {
      qb.andWhere('investment.type = :type', { type });
    }
    if (isActive !== undefined) {
      qb.andWhere('investment.isActive = :isActive', { isActive });
    }

    return qb
      .orderBy('investment.createdAt', 'DESC')
      .skip(pagination.skip)
      .take(pagination.take)
      .getManyAndCount();
  }

  // Writes a snapshot of the OLD currentValue into investment_history.
  // Accepts an optional EntityManager so callers inside a QueryRunner can pass
  // qr.manager — keeping the snapshot and the value update on the same connection.
  async snapshotCurrentValue(
    investmentId: string,
    oldValue: number,
    manager?: EntityManager,
  ): Promise<void> {
    const em = manager ?? this.entityRepository.manager;
    const snapshot = em.create(InvestmentHistory, {
      investmentId,
      valueSnapshot: oldValue,
    });
    await em.save(InvestmentHistory, snapshot);
  }
}
