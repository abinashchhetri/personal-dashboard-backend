import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

import { PaginationQueryDto } from 'src/common/dtos/pagination.dto';

export class FindAllTransfersDto extends PaginationQueryDto {
  // Matches transfers where this account is either the source or destination.
  @ApiPropertyOptional({ example: 'uuid-of-account' })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
