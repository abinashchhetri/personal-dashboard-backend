import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import { DateRangeDto } from './date-range.dto';

export class ItemTrendDto extends DateRangeDto {
  @ApiProperty({ example: 'dal' })
  @IsString()
  @IsNotEmpty()
  itemName!: string;
}
