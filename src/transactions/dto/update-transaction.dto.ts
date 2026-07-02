import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

// Only note and categoryId are editable after creation.
// Amount and line items are immutable — delete and recreate if incorrect.
export class UpdateTransactionDto {
  @ApiPropertyOptional({ example: 'Updated note' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: 'uuid-of-category' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
