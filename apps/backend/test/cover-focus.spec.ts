import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CoverFocusDto,
  COVER_FOCUS_DEFAULTS,
  coverFocusCreateData,
  coverFocusUpdateData,
  isClearedImageUrl,
} from '../src/common/dto/cover-focus.dto';

async function errorsOf(plain: Record<string, unknown>) {
  const dto = plainToInstance(CoverFocusDto, plain);
  return validate(dto);
}

describe('CoverFocusDto', () => {
  it('приймає порожній об\'єкт і типові межі', async () => {
    expect(await errorsOf({})).toHaveLength(0);
    expect(await errorsOf({ coverPositionX: 0, coverPositionY: 1, coverScale: 1 })).toHaveLength(0);
    expect(await errorsOf({ coverPositionX: 0.5, coverPositionY: 0.5, coverScale: 3 })).toHaveLength(0);
  });

  it('приводить рядки до чисел', async () => {
    const dto = plainToInstance(CoverFocusDto, {
      coverPositionX: '0.25',
      coverPositionY: '0.75',
      coverScale: '1.5',
    });
    expect(dto.coverPositionX).toBe(0.25);
    expect(dto.coverPositionY).toBe(0.75);
    expect(dto.coverScale).toBe(1.5);
    expect(await validate(dto)).toHaveLength(0);
  });

  it.each([
    { coverPositionX: -0.01 },
    { coverPositionX: 1.01 },
    { coverPositionY: -1 },
    { coverPositionY: 2 },
    { coverScale: 0.99 },
    { coverScale: 3.01 },
    { coverPositionX: Number.NaN },
    { coverScale: Number.POSITIVE_INFINITY },
  ])('відхиляє %j', async (plain) => {
    expect(await errorsOf(plain)).not.toHaveLength(0);
  });
});

describe('coverFocus persistence helpers', () => {
  it('create підставляє центр і scale=1', () => {
    expect(coverFocusCreateData({})).toEqual(COVER_FOCUS_DEFAULTS);
    expect(coverFocusCreateData({ coverPositionX: 0.2, coverScale: 1.4 })).toEqual({
      coverPositionX: 0.2,
      coverPositionY: 0.5,
      coverScale: 1.4,
    });
  });

  it('очищення зображення скидає кадр', () => {
    expect(isClearedImageUrl('')).toBe(true);
    expect(isClearedImageUrl('   ')).toBe(true);
    expect(isClearedImageUrl(undefined)).toBe(false);
    expect(
      coverFocusUpdateData({ coverPositionX: 0.1 }, { imageCleared: true }),
    ).toEqual(COVER_FOCUS_DEFAULTS);
  });

  it('заміна зображення без нових координат скидає кадр', () => {
    expect(
      coverFocusUpdateData({}, { imageCleared: false, imageReplaced: true }),
    ).toEqual(COVER_FOCUS_DEFAULTS);
  });

  it('заміна зображення з явним фокусом зберігає його', () => {
    expect(
      coverFocusUpdateData(
        { coverPositionX: 0.2, coverPositionY: 0.8, coverScale: 1.3 },
        { imageCleared: false, imageReplaced: true },
      ),
    ).toEqual({
      coverPositionX: 0.2,
      coverPositionY: 0.8,
      coverScale: 1.3,
    });
  });

  it('оновлення без зміни зображення зберігає лише передані поля', () => {
    expect(
      coverFocusUpdateData({ coverScale: 2 }, { imageCleared: false, imageReplaced: false }),
    ).toEqual({ coverScale: 2 });
    expect(
      coverFocusUpdateData({}, { imageCleared: false, imageReplaced: false }),
    ).toEqual({});
  });
});
