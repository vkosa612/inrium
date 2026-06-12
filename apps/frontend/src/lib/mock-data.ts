export type Category =
  | 'Новини'
  | 'Огляди'
  | 'Статті'
  | 'Системи'
  | 'Набори'
  | 'Допомога'
  | 'Спільнота';

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: Category;
  date: string;
  readTime: string;
  views?: string;
  gradient: string;
  featured?: boolean;
}

export interface GameSystem {
  id: string;
  name: string;
  description: string;
  genre: string;
  complexity: 'Легка' | 'Середня' | 'Складна';
  gradient: string;
  players: string;
}

export interface Kit {
  id: string;
  title: string;
  type: string;
  description: string;
  gradient: string;
  tag: string;
}

export interface HelpItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
}

export const CATEGORY_STYLES: Record<Category, string> = {
  Новини: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  Огляди: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  Статті: 'bg-pink-500/15 text-pink-400 border-pink-500/25',
  Системи: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  Набори: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  Допомога: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  Спільнота: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
};

export const FEATURED_ARTICLE: Article = {
  id: 'feat-1',
  title: 'Як почати грати в D&D у 2026 році: повний посібник для новачків',
  excerpt:
    'Настільні рольові ігри переживають ренесанс. Більше трьох мільйонів нових гравців у 2025 році. Ми зібрали все необхідне, щоб твоя перша пригода стала незабутньою.',
  category: 'Статті',
  date: '12 червня 2026',
  readTime: '12 хв',
  views: '18.4k',
  gradient: 'from-violet-900/80 via-purple-950/60 to-[#0c0c14]',
  featured: true,
};

export const TOP_ARTICLES: Article[] = [
  {
    id: 'top-1',
    title: 'Огляд Pathfinder 2e: тактична глибина для досвідчених',
    excerpt: 'Система, яка не боїться складності. Детальний огляд механік і порівняння з D&D 5e.',
    category: 'Огляди',
    date: '10 червня 2026',
    readTime: '8 хв',
    gradient: 'from-red-900/70 via-rose-950/50 to-[#0c0c14]',
  },
  {
    id: 'top-2',
    title: '5 систем для темного фентезі — вибір редакції',
    excerpt: 'Від Warhammer Fantasy до Shadow of the Demon Lord. Темна атмосфера, похмурі пригоди.',
    category: 'Статті',
    date: '9 червня 2026',
    readTime: '6 хв',
    gradient: 'from-slate-800/70 via-gray-900/50 to-[#0c0c14]',
  },
  {
    id: 'top-3',
    title: "Cyberpunk RED: вийшло доповнення 'Night City Underbelly'",
    excerpt: 'Нові правила для вуличних операцій, 40 локацій та повноцінна кампанія для 4-6 гравців.',
    category: 'Новини',
    date: '8 червня 2026',
    readTime: '4 хв',
    gradient: 'from-cyan-900/70 via-teal-950/50 to-[#0c0c14]',
  },
  {
    id: 'top-4',
    title: 'Що потрібно майстру для першої гри',
    excerpt: 'Мінімальний набір: правила, сценарій і впевненість. Розбираємо по кроках.',
    category: 'Допомога',
    date: '7 червня 2026',
    readTime: '5 хв',
    gradient: 'from-emerald-900/70 via-green-950/50 to-[#0c0c14]',
  },
];

export const LATEST_NEWS: Article[] = [
  {
    id: 'news-1',
    title: "Wizards of the Coast анонсували D&D 2027 Edition",
    excerpt: 'Нове видання обіцяє зворотну сумісність та спрощену систему підготовки пригод.',
    category: 'Новини',
    date: '12 червня 2026',
    readTime: '3 хв',
    gradient: 'from-violet-900/60 to-[#0c0c14]',
  },
  {
    id: 'news-2',
    title: 'Paizo оголосили про Ukrainian Edition Pathfinder 2e',
    excerpt: 'Перший офіційний україномовний переклад системи вийде у четвертому кварталі 2026.',
    category: 'Новини',
    date: '11 червня 2026',
    readTime: '3 хв',
    gradient: 'from-amber-900/60 to-[#0c0c14]',
  },
  {
    id: 'news-3',
    title: 'Підсумки TTRPG Summit Kyiv 2026',
    excerpt: '600 учасників, 40 гральних столів і рекордна кількість дебютантів у настільних RPG.',
    category: 'Спільнота',
    date: '10 червня 2026',
    readTime: '5 хв',
    gradient: 'from-blue-900/60 to-[#0c0c14]',
  },
  {
    id: 'news-4',
    title: 'Call of Cthulhu 8th Edition: перша інформація',
    excerpt: "Chaosium підтвердили роботу над новим виданням. Збережено ретро-атмосферу, оновлено core механіки.",
    category: 'Новини',
    date: '9 червня 2026',
    readTime: '4 хв',
    gradient: 'from-green-900/60 to-[#0c0c14]',
  },
];

export const POPULAR_ARTICLES: Article[] = [
  {
    id: 'pop-1',
    title: 'Вампір: Маскарад — гра про жах зсередини',
    excerpt: 'Соціальний жах, боротьба з природою звіра і готичний Всесвіт.',
    category: 'Огляди',
    date: '5 червня 2026',
    readTime: '10 хв',
    views: '32.1k',
    gradient: 'from-red-900/60 to-[#0c0c14]',
  },
  {
    id: 'pop-2',
    title: 'Як описувати оточення так, щоб гравці відчули атмосферу',
    excerpt: 'Техніки майстра: сенсорні деталі, темп і пауза.',
    category: 'Статті',
    date: '2 червня 2026',
    readTime: '7 хв',
    views: '28.7k',
    gradient: 'from-pink-900/60 to-[#0c0c14]',
  },
  {
    id: 'pop-3',
    title: 'Blades in the Dark: найкраща гра про злочинців',
    excerpt: "Forged in the Dark система для кампаній у стилі 'пограбування'.",
    category: 'Огляди',
    date: '29 травня 2026',
    readTime: '9 хв',
    views: '21.3k',
    gradient: 'from-slate-700/60 to-[#0c0c14]',
  },
];

export const GAME_SYSTEMS: GameSystem[] = [
  {
    id: 'sys-1',
    name: 'D&D 5e',
    description: 'Класичне фентезі. Найпоширеніша система у світі з величезною спільнотою та бібліотекою матеріалів.',
    genre: 'Фентезі',
    complexity: 'Середня',
    gradient: 'from-violet-700 to-purple-950',
    players: '3–6',
  },
  {
    id: 'sys-2',
    name: 'Pathfinder 2e',
    description: 'Тактична глибина та безмежна кастомізація персонажів. Ідеальна для стратегічних гравців.',
    genre: 'Фентезі',
    complexity: 'Складна',
    gradient: 'from-red-700 to-rose-950',
    players: '3–6',
  },
  {
    id: 'sys-3',
    name: 'Call of Cthulhu',
    description: 'Дослідницький жах у дусі Лавкрафта. Виживання, божевілля і таємниці Древніх.',
    genre: 'Жах',
    complexity: 'Середня',
    gradient: 'from-emerald-800 to-green-950',
    players: '2–5',
  },
  {
    id: 'sys-4',
    name: 'Vampire: Masquerade',
    description: 'Готичний панк. Ви вампір у сучасному місті, балансуєте між людяністю і звіром.',
    genre: 'Міський жах',
    complexity: 'Середня',
    gradient: 'from-red-900 to-slate-950',
    players: '3–5',
  },
  {
    id: 'sys-5',
    name: 'Cyberpunk RED',
    description: 'Найближче майбутнє, корпорації і вулиця. Класичний кіберпанк повернувся.',
    genre: 'Кіберпанк',
    complexity: 'Середня',
    gradient: 'from-cyan-800 to-teal-950',
    players: '3–6',
  },
  {
    id: 'sys-6',
    name: 'Blades in the Dark',
    description: 'Пограбування та злочини у темному індустріальному місті. Унікальна Forged in the Dark механіка.',
    genre: 'Темне фентезі',
    complexity: 'Легка',
    gradient: 'from-slate-600 to-gray-950',
    players: '2–5',
  },
];

export const KITS: Kit[] = [
  {
    id: 'kit-1',
    title: 'Стартовий набір D&D 5e',
    type: 'Стартовий набір',
    description: 'Все для першої гри: пригода, персонажі, кубики та правила.',
    gradient: 'from-violet-800/40 to-[#12121f]',
    tag: 'Для новачків',
  },
  {
    id: 'kit-2',
    title: 'Набір Майстра підземель',
    type: 'Ресурс для майстра',
    description: 'Таблиці випадкових подій, карти локацій та бестіарій.',
    gradient: 'from-amber-800/40 to-[#12121f]',
    tag: 'Для майстрів',
  },
  {
    id: 'kit-3',
    title: 'Збірка пригод для одного вечора',
    type: 'Готова пригода',
    description: '12 сценаріїв на 3-4 години гри. Відмінно для знайомства з системою.',
    gradient: 'from-emerald-800/40 to-[#12121f]',
    tag: 'One-shot',
  },
  {
    id: 'kit-4',
    title: 'Аркуші персонажів — усі системи',
    type: 'Ресурс для гравця',
    description: 'Друковані та цифрові аркуші для 30+ ігрових систем.',
    gradient: 'from-cyan-800/40 to-[#12121f]',
    tag: 'Безкоштовно',
  },
];

export const HELP_ITEMS: HelpItem[] = [
  { id: 'h-1', title: 'Як почати', description: 'Покрокове введення у світ настільних RPG для абсолютних новачків.', icon: '🎲', href: '/help/start' },
  { id: 'h-2', title: 'Вибір системи', description: 'Порівняльна таблиця популярних систем: від D&D до Fate.', icon: '📖', href: '/help/choose-system' },
  { id: 'h-3', title: 'Знайти групу', description: 'Як знайти гравців або приєднатися до існуючої кампанії.', icon: '👥', href: '/help/find-group' },
  { id: 'h-4', title: 'Стати майстром', description: 'Гайд для першого Game Master: підготовка і ведення гри.', icon: '🏰', href: '/help/be-gm' },
  { id: 'h-5', title: 'FAQ', description: 'Відповіді на найчастіші питання нових гравців і майстрів.', icon: '❓', href: '/help/faq' },
];

export const POPULAR_TAGS = [
  'D&D', 'Фентезі', 'Жах', 'Кіберпанк', 'One-shot',
  'Для новачків', 'Pathfinder', 'Вампір', 'Детектив', 'Sci-Fi',
];

export const SIDEBAR_TOP_SYSTEMS = [
  { name: 'D&D 5e', count: '12.4k гравців' },
  { name: 'Pathfinder 2e', count: '5.2k гравців' },
  { name: 'Vampire: Masquerade', count: '3.8k гравців' },
  { name: 'Call of Cthulhu', count: '2.9k гравців' },
  { name: 'Cyberpunk RED', count: '2.1k гравців' },
];
