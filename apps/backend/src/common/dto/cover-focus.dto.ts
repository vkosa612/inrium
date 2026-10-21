import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export const COVER_POSITION_MIN = 0;
export const COVER_POSITION_MAX = 1;
export const COVER_SCALE_MIN = 1;
export const COVER_SCALE_MAX = 3;
export const COVER_POSITION_DEFAULT = 0.5;
export const COVER_SCALE_DEFAULT = 1;

const POSITION_MSG = `coverPositionX/Y мають бути від ${COVER_POSITION_MIN} до ${COVER_POSITION_MAX}`;
const SCALE_MSG = `coverScale має бути від ${COVER_SCALE_MIN} до ${COVER_SCALE_MAX}`;

/** Нормалізоване панорамування (0–1 від переповнення) і масштаб (≥1 поверх cover-fit). */
export class CoverFocusDto {
  @ApiPropertyOptional({ minimum: COVER_POSITION_MIN, maximum: COVER_POSITION_MAX, default: COVER_POSITION_DEFAULT })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(COVER_POSITION_MIN, { message: POSITION_MSG })
  @Max(COVER_POSITION_MAX, { message: POSITION_MSG })
  coverPositionX?: number;

  @ApiPropertyOptional({ minimum: COVER_POSITION_MIN, maximum: COVER_POSITION_MAX, default: COVER_POSITION_DEFAULT })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(COVER_POSITION_MIN, { message: POSITION_MSG })
  @Max(COVER_POSITION_MAX, { message: POSITION_MSG })
  coverPositionY?: number;

  @ApiPropertyOptional({ minimum: COVER_SCALE_MIN, maximum: COVER_SCALE_MAX, default: COVER_SCALE_DEFAULT })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(COVER_SCALE_MIN, { message: SCALE_MSG })
  @Max(COVER_SCALE_MAX, { message: SCALE_MSG })
  coverScale?: number;
}

export const COVER_FOCUS_SELECT = {
  coverPositionX: true,
  coverPositionY: true,
  coverScale: true,
} as const;

export const COVER_FOCUS_DEFAULTS = {
  coverPositionX: COVER_POSITION_DEFAULT,
  coverPositionY: COVER_POSITION_DEFAULT,
  coverScale: COVER_SCALE_DEFAULT,
} as const;

export function coverFocusCreateData(dto: CoverFocusDto) {
  return {
    coverPositionX: dto.coverPositionX ?? COVER_POSITION_DEFAULT,
    coverPositionY: dto.coverPositionY ?? COVER_POSITION_DEFAULT,
    coverScale: dto.coverScale ?? COVER_SCALE_DEFAULT,
  };
}

/** Якщо зображення очищено або замінено без нових координат — центр і scale=1. */
export function coverFocusUpdateData(
  dto: CoverFocusDto,
  opts: { imageCleared: boolean; imageReplaced?: boolean },
) {
  const hasExplicitFocus =
    dto.coverPositionX !== undefined ||
    dto.coverPositionY !== undefined ||
    dto.coverScale !== undefined;
  if (opts.imageCleared || (opts.imageReplaced && !hasExplicitFocus)) {
    return { ...COVER_FOCUS_DEFAULTS };
  }
  return {
    ...(dto.coverPositionX !== undefined && { coverPositionX: dto.coverPositionX }),
    ...(dto.coverPositionY !== undefined && { coverPositionY: dto.coverPositionY }),
    ...(dto.coverScale !== undefined && { coverScale: dto.coverScale }),
  };
}

export function isClearedImageUrl(value: string | undefined): boolean {
  return value !== undefined && value.trim() === '';
}
