import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsObject, IsOptional, IsPositive } from 'class-validator';

export class UpdateInvestmentDto {
  @ApiPropertyOptional({ example: 58000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  currentValue?: number;

  @ApiPropertyOptional({
    example: { scrip: 'NABIL', quantity: 150, buyPricePerUnit: 500 },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
