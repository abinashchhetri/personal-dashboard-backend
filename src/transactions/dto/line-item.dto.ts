import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class LineItemDto {
  @ApiProperty({ example: 'Momo at local restaurant' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 250.0 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount!: number;
}
