import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsPositive, IsUUID, Max, Min } from 'class-validator';

export class DuplicateCheckDto {
  @ApiProperty({ example: 'uuid-of-account' })
  @IsUUID()
  accountId!: string;

  @ApiProperty({ example: 250.0, description: 'Amount to check against totalAmount' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ example: 10, default: 10, description: 'Look-back window in minutes (1–1440)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  withinMinutes?: number;
}
