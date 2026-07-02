import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

import { PaginationQueryDto } from 'src/common/dtos/pagination.dto';
import { InvestmentTypeEnum } from '../enums/investment-type.enum';

export class FindAllInvestmentsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: InvestmentTypeEnum })
  @IsOptional()
  @IsEnum(InvestmentTypeEnum)
  type?: InvestmentTypeEnum;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;
}
