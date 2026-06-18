import { ApiProperty } from '@nestjs/swagger';
import { BookmarkTargetType } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class CreateBookmarkDto {
  @ApiProperty({ enum: BookmarkTargetType })
  @IsEnum(BookmarkTargetType)
  targetType!: BookmarkTargetType;

  @ApiProperty({ description: 'ID of content item, system, or kit' })
  @IsString()
  @MinLength(1)
  targetId!: string;
}
