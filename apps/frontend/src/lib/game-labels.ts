export const GAME_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Чернетка',
  OPEN: 'Відкрита',
  FULL: 'Закрита для заявок',
  IN_PROGRESS: 'Триває',
  FINISHED: 'Завершена',
  CANCELLED: 'Скасована',
};

/** Статус набору на публічних сторінках */
export const RECRUITMENT_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Відкрита для заявок',
  FULL: 'Закрита для заявок',
  IN_PROGRESS: 'Гра триває',
  FINISHED: 'Завершена',
  CANCELLED: 'Скасована',
};

export const APPLICATION_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Очікує рішення',
  APPROVED: 'Схвалено',
  REJECTED: 'Відхилено',
  CANCELLED: 'Скасовано',
  REMOVED: 'Виключено майстром',
};

export const APPLICATION_STATUS_COLOR: Record<string, string> = {
  PENDING: '#f59e0b',
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
  CANCELLED: '#6b7280',
  REMOVED: '#a855f7',
};

export function recruitmentStatusLabel(status: string): string {
  return RECRUITMENT_STATUS_LABEL[status] ?? GAME_STATUS_LABEL[status] ?? status;
}

/** Короткий список імен гравців для карток */
export function formatApprovedPlayerNames(names: string[], maxVisible = 3): string {
  if (names.length === 0) return '';
  if (names.length <= maxVisible) return names.join(', ');
  const visible = names.slice(0, maxVisible).join(', ');
  return `${visible}… +${names.length - maxVisible}`;
}

export function formatGameDate(d: string | null | undefined): string {
  if (!d) return 'Дата уточнюється';
  return new Date(d).toLocaleString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function slugifyTitle(title: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye', ж: 'zh', з: 'z',
    и: 'y', і: 'i', ї: 'yi', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
    р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'yu', я: 'ya',
  };
  return title.toLowerCase().split('').map((c) => map[c] ?? c).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 80);
}
