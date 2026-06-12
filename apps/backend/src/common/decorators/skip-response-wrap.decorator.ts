import { SetMetadata } from '@nestjs/common';

export const SKIP_RESPONSE_WRAP_KEY = 'skipResponseWrap';

/**
 * Застосуй до контролера або ендпоінту, щоб пропустити обгортання у
 * { success, data, timestamp } і повернути відповідь як є.
 */
export const SkipResponseWrap = () =>
  SetMetadata(SKIP_RESPONSE_WRAP_KEY, true);
