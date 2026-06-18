import { ApiProperty } from '@nestjs/swagger';
import { BookmarkTargetType } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class CheckBookmarkQueryDto {
  @ApiProperty({ enum: BookmarkTargetType })
  @IsEnum(BookmarkTargetType)
  targetType!: BookmarkTargetType;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  targetId!: string;
}
