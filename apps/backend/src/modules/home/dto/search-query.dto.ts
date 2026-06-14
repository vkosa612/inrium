import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SearchQueryDto {
  @ApiPropertyOptional({ example: 'dnd', description: 'Search query (min 2 chars)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
