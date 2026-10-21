/** Українські підписи ролей користувача */
export const USER_ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Адміністратор',
  EDITOR: 'Редактор',
  GAME_MASTER: 'Майстер',
  PLAYER: 'Гравець',
};

/** Українські підписи статусів акаунта */
export const USER_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Активний',
  BLOCKED: 'Заблокований',
  DELETED: 'Видалений',
};

/** Типи блоків головної сторінки */
export const HOME_BLOCK_TYPE_LABEL: Record<string, string> = {
  HERO: 'Головний банер',
  FEATURED_GRID: 'Рекомендоване',
  LATEST_NEWS: 'Останні новини',
  GAMES: 'Ігрові сесії',
  GAME_SYSTEMS: 'Ігрові системи',
  HELP: 'Довідка',
};

export function roleLabel(role: string): string {
  return USER_ROLE_LABEL[role] ?? role;
}

export function userStatusLabel(status: string): string {
  return USER_STATUS_LABEL[status] ?? status;
}

export function homeBlockTypeLabel(type: string): string {
  return HOME_BLOCK_TYPE_LABEL[type] ?? type;
}
