import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsSafeImageUrl } from '../../../common/validators/safe-image-url.validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Brave Adventurer' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  displayName?: string;

  @ApiPropertyOptional({ example: 'Люблю D&D та Pathfinder' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  @IsSafeImageUrl()
  avatarUrl?: string;
}
