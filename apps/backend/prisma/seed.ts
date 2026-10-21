import {
  ContentStatus,
  ContentType,
  GameStatus,
  HomePageBlockType,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { resolveSeedPlan } from './seed-guard';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function upsertContent(data: {
  type: ContentType;
  status: ContentStatus;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  isFeatured?: boolean;
  showOnHomePage?: boolean;
  publishedAt?: Date;
  authorId: string;
  categoryId?: string;
  tagIds?: string[];
}) {
  const { tagIds = [], ...rest } = data;

  const item = await prisma.contentItem.upsert({
    where: { slug: rest.slug },
    update: {},
    create: rest,
  });

  if (tagIds.length > 0) {
    await prisma.contentTag.createMany({
      data: tagIds.map((tagId) => ({ contentItemId: item.id, tagId })),
      skipDuplicates: true,
    });
  }

  return item;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting INRIUM seed...\n');

  // Захист: у production seed не запускається з демо-паролями/службовими адресами (див. seed-guard.ts).
  const plan = resolveSeedPlan();
  if (plan.production) {
    console.log('⚠️  PRODUCTION seed: лише адміністратор, довідник, стартовий контент (без демо-ігор/спільнот).\n');
  }

  // ── Users ────────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: plan.admin.email },
    update: {},
    create: {
      email: plan.admin.email,
      passwordHash: await bcrypt.hash(plan.admin.password, SALT_ROUNDS),
      displayName: 'INRIUM Admin',
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  });

  // Автор стартового контенту: редактор (якщо заданий) або адміністратор.
  const editor = plan.editor
    ? await prisma.user.upsert({
        where: { email: plan.editor.email },
        update: {},
        create: {
          email: plan.editor.email,
          passwordHash: await bcrypt.hash(plan.editor.password, SALT_ROUNDS),
          displayName: 'INRIUM Editor',
          role: UserRole.EDITOR,
          emailVerified: true,
        },
      })
    : admin;

  console.log(`✅ Users     : ${admin.email} (ADMIN)${plan.editor ? `, ${editor.email} (EDITOR)` : ''}`);

  const gm = plan.gm
    ? await prisma.user.upsert({
        where: { email: plan.gm.email },
        update: {},
        create: {
          email: plan.gm.email,
          passwordHash: await bcrypt.hash(plan.gm.password, SALT_ROUNDS),
          displayName: 'Demo Game Master',
          role: UserRole.GAME_MASTER,
          bio: 'Демо-майстер для тестових ігрових сесій.',
          emailVerified: true,
        },
      })
    : null;
  if (gm) console.log(`✅ GM user   : ${gm.email} (GAME_MASTER)`);

  // ── Categories ────────────────────────────────────────────────────────────────
  const catDefs = [
    { name: 'Новини', slug: 'news', type: ContentType.NEWS },
    { name: 'Статті', slug: 'articles', type: ContentType.ARTICLE },
    { name: 'Ігрові системи', slug: 'game-systems', type: ContentType.GAME_SYSTEM },
    { name: 'Допомога', slug: 'help', type: ContentType.HELP_PAGE },
  ];

  const cats: Record<string, string> = {};
  for (const def of catDefs) {
    const c = await prisma.category.upsert({
      where: { slug: def.slug },
      update: {},
      create: def,
    });
    cats[def.slug] = c.id;
  }

  console.log(`✅ Categories : ${catDefs.map((c) => c.name).join(', ')}`);

  // ── Tags ──────────────────────────────────────────────────────────────────────
  const tagDefs = [
    { name: 'D&D', slug: 'dnd' },
    { name: 'Pathfinder', slug: 'pathfinder' },
    { name: 'Call of Cthulhu', slug: 'coc' },
    { name: 'Vampire: the Masquerade', slug: 'vtm' },
    { name: 'Новачкам', slug: 'beginners' },
    { name: 'Майстру', slug: 'gm' },
    { name: 'Темне фентезі', slug: 'dark-fantasy' },
    { name: 'Sci-Fi', slug: 'sci-fi' },
    { name: 'One-shot', slug: 'one-shot' },
    { name: 'Кампанія', slug: 'campaign' },
  ];

  const tags: Record<string, string> = {};
  for (const def of tagDefs) {
    const t = await prisma.tag.upsert({
      where: { slug: def.slug },
      update: {},
      create: def,
    });
    tags[def.slug] = t.id;
  }

  console.log(`✅ Tags       : ${tagDefs.map((t) => t.name).join(', ')}`);

  // ── Content items ─────────────────────────────────────────────────────────────
  const now = new Date();

  // NEWS ×2
  await upsertContent({
    type: ContentType.NEWS,
    status: ContentStatus.PUBLISHED,
    title: 'INRIUM відкривається: нова платформа для настільних рольових ігор',
    slug: 'inrium-launch',
    excerpt: 'Зустрічайте INRIUM — портал для майстрів та гравців в настільні рольові ігри в Україні.',
    content:
      '## Ласкаво просимо до INRIUM!\n\nINRIUM — це нова платформа для спільноти любителів настільних рольових ігор. Тут ви знайдете статті, ігрові системи та все необхідне для незабутніх пригод.\n\n### Що вас чекає\n\n- Огляди ігрових систем\n- Статті для новачків і досвідчених майстрів\n- Довідка для першої сесії\n- Можливість знайти групу для гри',
    isFeatured: true,
    showOnHomePage: true,
    publishedAt: now,
    authorId: admin.id,
    categoryId: cats['news'],
    tagIds: [tags['beginners']],
  });

  await upsertContent({
    type: ContentType.NEWS,
    status: ContentStatus.PUBLISHED,
    title: "D&D 2024: що нового у переробленому Player's Handbook",
    slug: 'dnd-2024-phb-review',
    excerpt: "Wizards of the Coast випустили оновлений Player's Handbook. Розбираємо ключові зміни.",
    content:
      "## D&D 2024: новий погляд на PHB\n\nWizards of the Coast оновили основну книгу гравця. Ключові зміни торкнулися механіки походження, магічних предметів та балансу класів.\n\n### Основні зміни\n\n- Нова система походження персонажа\n- Оновлені правила магії\n- Перероблені класи та підкласи",
    isFeatured: false,
    showOnHomePage: true,
    publishedAt: now,
    authorId: editor.id,
    categoryId: cats['news'],
    tagIds: [tags['dnd'], tags['beginners']],
  });

  // ARTICLES ×2
  await upsertContent({
    type: ContentType.ARTICLE,
    status: ContentStatus.PUBLISHED,
    title: 'Як почати грати в D&D у 2026 році: покроковий гайд',
    slug: 'how-to-start-dnd-2026',
    excerpt: 'Повний гайд для тих, хто хоче почати грати в Dungeons & Dragons, але не знає з чого почати.',
    content:
      '## З чого почати?\n\nDungeons & Dragons — найвідоміша настільна рольова гра у світі.\n\n### Крок 1: Ознайомтесь з базовими правилами\n\nBasic Rules доступні безкоштовно. Вони містять усе необхідне.\n\n### Крок 2: Знайдіть групу\n\nD&D — гра для компанії. Шукайте гравців серед друзів або в онлайн-спільнотах.\n\n### Крок 3: Почніть з готової пригоди\n\nThe Lost Mine of Phandelver — ідеальна стартова пригода для новачків.',
    isFeatured: true,
    showOnHomePage: true,
    publishedAt: now,
    authorId: editor.id,
    categoryId: cats['articles'],
    tagIds: [tags['dnd'], tags['beginners']],
  });

  await upsertContent({
    type: ContentType.ARTICLE,
    status: ContentStatus.PUBLISHED,
    title: '5 систем для темного фентезі: огляд від майстра',
    slug: 'dark-fantasy-systems-overview',
    excerpt: 'Якщо стандартне фентезі видається занадто яскравим — ось 5 систем для похмурих пригод.',
    content:
      '## Темне фентезі в TTRPG\n\n### 1. Warhammer Fantasy Roleplay\n\nКласика темного фентезі. Жорстокий світ, смертоносна бойова система.\n\n### 2. Vampire: the Masquerade\n\nГра про вампірів та інтриги. Темне міське фентезі.\n\n### 3. Call of Cthulhu\n\nЖах у стилі Лавкрафта. Персонажі слабкі, безум чекає за кожним кутом.\n\n### 4. Symbaroum\n\nСкандинавська система з акцентом на таємниці.\n\n### 5. Forbidden Lands\n\nПостапокаліптичне темне фентезі у стилі OSR.',
    isFeatured: true,
    showOnHomePage: false,
    publishedAt: now,
    authorId: editor.id,
    categoryId: cats['articles'],
    tagIds: [tags['dark-fantasy'], tags['gm'], tags['vtm']],
  });

  // GAME SYSTEMS ×4
  await upsertContent({
    type: ContentType.GAME_SYSTEM,
    status: ContentStatus.PUBLISHED,
    title: 'Dungeons & Dragons 5e',
    slug: 'dnd-5e',
    excerpt: 'Найпопулярніша настільна рольова гра у світі. Ідеальна для новачків та досвідчених гравців.',
    content:
      '## Dungeons & Dragons 5-та редакція\n\nD&D 5e — найдоступніша версія легендарної гри.\n\n### Система\n\nD20-механіка. Кидаєте 20-гранний кубик, додаєте бонуси і порівнюєте з цільовим числом.\n\n### Для кого\n\n- Складність: початковий/середній рівень\n- Жанр: класичне фентезі\n- Рекомендовано: 3–6 гравців',
    isFeatured: true,
    showOnHomePage: true,
    publishedAt: now,
    authorId: editor.id,
    categoryId: cats['game-systems'],
    tagIds: [tags['dnd'], tags['beginners'], tags['campaign']],
  });

  await upsertContent({
    type: ContentType.GAME_SYSTEM,
    status: ContentStatus.PUBLISHED,
    title: 'Pathfinder 2e',
    slug: 'pathfinder-2e',
    excerpt: 'Глибока тактична система з широкими можливостями кастомізації персонажа.',
    content:
      "## Pathfinder 2-га редакція\n\nТактична рольова система від Paizo з детальним опрацюванням персонажа.\n\n### Особливості\n\n- **Три дії** за хід замість стандартних двох\n- Система Ancestry/Heritage\n- Великий вибір класів і підкласів\n- Безкоштовна база правил — Archives of Nethys",
    isFeatured: true,
    showOnHomePage: true,
    publishedAt: now,
    authorId: editor.id,
    categoryId: cats['game-systems'],
    tagIds: [tags['pathfinder'], tags['beginners'], tags['campaign']],
  });

  await upsertContent({
    type: ContentType.GAME_SYSTEM,
    status: ContentStatus.PUBLISHED,
    title: 'Call of Cthulhu 7e',
    slug: 'call-of-cthulhu-7e',
    excerpt: 'Гра жахів у всесвіті Лавкрафта. Дослідники проти незбагненних космічних жахів.',
    content:
      "## Call of Cthulhu\n\nClassic horror RPG від Chaosium. Гравці беруть роль дослідників 1920-х, які стикаються з незбагненними силами.\n\n### BRP-система\n\nВідсоткова система навичок. Персонажі смертні, безум — реальна загроза.",
    isFeatured: false,
    showOnHomePage: true,
    publishedAt: now,
    authorId: editor.id,
    categoryId: cats['game-systems'],
    tagIds: [tags['coc'], tags['dark-fantasy'], tags['one-shot']],
  });

  await upsertContent({
    type: ContentType.GAME_SYSTEM,
    status: ContentStatus.PUBLISHED,
    title: 'Vampire: the Masquerade 5e',
    slug: 'vampire-the-masquerade-5e',
    excerpt: 'Темна гра про вампірів, інтриги та пошук власної людяності.',
    content:
      '## Vampire: the Masquerade\n\nNarrative RPG про вампірів. Кожен персонаж бореться зі своєю звірячою природою у сучасному World of Darkness.\n\n### Клани та інтриги\n\nПолітика Камарилли, таємниці анарів, вічна боротьба за виживання.',
    isFeatured: false,
    showOnHomePage: true,
    publishedAt: now,
    authorId: editor.id,
    categoryId: cats['game-systems'],
    tagIds: [tags['vtm'], tags['dark-fantasy'], tags['campaign']],
  });

  await upsertContent({
    type: ContentType.ARTICLE,
    status: ContentStatus.PUBLISHED,
    title: 'Матеріали майстра для першої гри',
    slug: 'first-game-gm-kit',
    excerpt: 'Усе що потрібно майстру для проведення першої сесії: схеми, підказки, готові зустрічі.',
    content:
      "## Матеріали майстра-початківця\n\n### Що всередині\n\n- Схема першої сесії (хук → зав'язка → кульмінація)\n- 10 готових NPC з іменами та мотивацією\n- 5 бойових зустрічей різної складності\n- Генератор таверн\n- Підказки з нарації та управління темпом",
    isFeatured: true,
    showOnHomePage: true,
    publishedAt: now,
    authorId: editor.id,
    categoryId: cats['articles'],
    tagIds: [tags['gm'], tags['beginners'], tags['dnd']],
  });

  await upsertContent({
    type: ContentType.ARTICLE,
    status: ContentStatus.PUBLISHED,
    title: 'Матеріали для one-shot пригод',
    slug: 'one-shot-adventure-kit',
    excerpt: 'Готові матеріали для захоплюючої one-shot пригоди за один вечір.',
    content:
      '## One-shot пригода\n\nПовний пакет матеріалів для самодостатньої пригоди на один вечір.\n\n### Включено\n\n- 3 сценарії різних жанрів\n- Преґенеровані персонажі\n- Карти та схеми локацій\n- Швидкі правила для нових гравців',
    isFeatured: false,
    showOnHomePage: true,
    publishedAt: now,
    authorId: editor.id,
    categoryId: cats['articles'],
    tagIds: [tags['one-shot'], tags['beginners'], tags['gm']],
  });

  // HELP PAGES ×2
  await upsertContent({
    type: ContentType.HELP_PAGE,
    status: ContentStatus.PUBLISHED,
    title: 'Що потрібно знати перед першою сесією',
    slug: 'before-first-session',
    excerpt: 'Базові поняття та правила, які допоможуть комфортно провести першу сесію.',
    content:
      '## Перед першою сесією\n\n### Базові поняття\n\n**Майстер (GM/DM)** — гравець, який веде гру і описує світ.\n\n**Гравці** — керують персонажами і приймають рішення.\n\n**Кубики** — визначають випадкові результати дій.\n\n### Що взяти на сесію\n\n- Набір кубиків (d4, d6, d8, d10, d12, d20)\n- Аркуш персонажа\n- Олівець та гумка',
    isFeatured: false,
    showOnHomePage: true,
    publishedAt: now,
    authorId: editor.id,
    categoryId: cats['help'],
    tagIds: [tags['beginners']],
  });

  await upsertContent({
    type: ContentType.HELP_PAGE,
    status: ContentStatus.PUBLISHED,
    title: 'Як знайти групу для гри',
    slug: 'how-to-find-group',
    excerpt: 'Практичні поради з пошуку компанії для настільних рольових ігор онлайн і офлайн.',
    content:
      '## Де шукати гравців?\n\n### Онлайн\n\n- Discord-сервери україномовних TTRPG спільнот\n- Roll20, Foundry VTT — онлайн платформи\n- Facebook-групи\n\n### Офлайн\n\n- Настільні ігротеки\n- Ігрові магазини\n- Університетські клуби',
    isFeatured: false,
    showOnHomePage: false,
    publishedAt: now,
    authorId: editor.id,
    categoryId: cats['help'],
    tagIds: [tags['beginners']],
  });

  await upsertContent({
    type: ContentType.HELP_PAGE,
    status: ContentStatus.PUBLISHED,
    title: 'Як почати користуватись INRIUM',
    slug: 'how-to-use-inrium',
    excerpt: 'Огляд функцій порталу INRIUM: пошук матеріалів, ігрові системи, реєстрація та ролі.',
    content:
      '## INRIUM — ваш TTRPG-портал\n\n### Що таке INRIUM?\n\nINRIUM — україномовний портал для гравців і майстрів настільних рольових ігор. Тут ви знайдете:\n\n- **Ігрові системи** — огляди D&D, Pathfinder, Call of Cthulhu та інших\n- **Новини та статті** — матеріали про TTRPG\n- **Довідку** — відповіді на часті питання\n\n### Як шукати матеріали?\n\nВикористовуй кнопку 🔍 у шапці або перейди на `/search`. Введи мінімум 2 символи — пошук охоплює весь контент сайту.\n\n### Фільтри\n\nНа сторінках систем, новин та статей є фільтри. Вибери жанр, складність або категорію, щоб звузити результати.\n\n### Реєстрація\n\nДля повного доступу зареєструйся або увійди через кнопку у правому куті шапки.',
    isFeatured: true,
    showOnHomePage: true,
    publishedAt: now,
    authorId: editor.id,
    categoryId: cats['help'],
    tagIds: [tags['beginners']],
  });

  await upsertContent({
    type: ContentType.HELP_PAGE,
    status: ContentStatus.PUBLISHED,
    title: 'Як обрати ігрову систему',
    slug: 'how-to-choose-system',
    excerpt: 'Порівняння популярних TTRPG-систем: що підходить для початківців, а що для досвідчених гравців.',
    content:
      '## Як обрати ігрову систему?\n\n### Для початківців\n\n**Dungeons & Dragons 5e** — найпопулярніша система з великою спільнотою і безліччю матеріалів. Ідеально для першого знайомства з TTRPG.\n\n**Pathfinder 2e** — детальна система з широким вибором механік. Підходить, якщо хочеш більше тактичних варіантів.\n\n### Для аматорів атмосфери\n\n**Call of Cthulhu** — жахи та детективні пригоди у стилі Говарда Лавкрафта. Акцент на розслідуваннях.\n\n**Mork Borg** — похмурий постапокаліпсис з мінімальними правилами і максимальним настроєм.\n\n### Поради при виборі\n\n1. Дізнайся жанр, який подобається твоїй групі\n2. Оціни складність — скільки часу готові витрачати на вивчення правил\n3. Перевір наявність матеріалів українською або зручного доступу до PDFів\n4. Спробуй one-shot перш ніж починати кампанію',
    isFeatured: false,
    showOnHomePage: true,
    publishedAt: now,
    authorId: editor.id,
    categoryId: cats['help'],
    tagIds: [tags['beginners'], tags['dnd'], tags['pathfinder']],
  });

  await upsertContent({
    type: ContentType.HELP_PAGE,
    status: ContentStatus.PUBLISHED,
    title: 'Ролі користувачів на INRIUM',
    slug: 'user-roles',
    excerpt: 'Player, Game Master, Editor, Admin — що означає кожна роль і які можливості вона дає.',
    content:
      '## Ролі користувачів INRIUM\n\nПісля реєстрації кожен користувач отримує роль. Від ролі залежить доступ до функцій сайту.\n\n### 🎲 Player (Гравець)\n\nБазова роль для всіх нових користувачів. Дозволяє:\n- Переглядати всі публічні матеріали\n- Використовувати пошук та фільтри\n- Керувати власним профілем\n\n### 🧙 Game Master (Майстер)\n\nДосвідчений гравець або провідний кампаній:\n- Всі можливості Player\n- Позначення як Game Master у профілі\n\n### ✏️ Editor (Редактор)\n\nПомічник адміністрації:\n- Всі можливості Game Master\n- Доступ до Адмінки\n- Може створювати та редагувати матеріали\n- Публікує контент після перевірки\n\n### 👑 Admin (Адміністратор)\n\nПовний доступ до платформи:\n- Всі можливості Editor\n- Може управляти ігровими системами\n- Управляє користувачами та ролями\n- Налаштовує головну сторінку',
    isFeatured: false,
    showOnHomePage: false,
    publishedAt: now,
    authorId: editor.id,
    categoryId: cats['help'],
    tagIds: [],
  });

  await upsertContent({
    type: ContentType.HELP_PAGE,
    status: ContentStatus.PUBLISHED,
    title: 'Як підготувати one-shot пригоду',
    slug: 'how-to-prepare-one-shot',
    excerpt: 'Покрокове керівництво з підготовки самодостатньої пригоди на один вечір для GM.',
    content:
      '## One-Shot: пригода за один вечір\n\n### Що таке one-shot?\n\nOne-shot — самодостатня пригода, яка починається і завершується протягом одного-двох ігрових сеансів (3–5 годин). Ідеально для знайомства з новою системою або групою.\n\n### Структура one-shot\n\n**1. Зачіпка (hook)** — швидке введення в проблему (5–10 хв)\n\n**2. Конфлікт** — основна частина з вибором і перешкодами\n\n**3. Кульмінація** — фінальна сцена або бій\n\n**4. Розв\'язка** — короткий епілог\n\n### Поради GM\n\n- Підготуй 3 сцени замість великої карти\n- Використовуй преґенерованих персонажів\n- Тримай темп — уникай зайвих правил у перший раз\n- Скористайся статтями та довідкою INRIUM для one-shot',
    isFeatured: false,
    showOnHomePage: true,
    publishedAt: now,
    authorId: editor.id,
    categoryId: cats['help'],
    tagIds: [tags['gm'], tags['one-shot']],
  });

  console.log(`✅ Content    : 2 news, 4 articles, 4 game systems, 6 help pages`);


  // ── Home page blocks ──────────────────────────────────────────────────────────
  const blockDefs = [
    { type: HomePageBlockType.HERO, title: 'Головний банер', position: 0 },
    { type: HomePageBlockType.FEATURED_GRID, title: 'Вибране', position: 1 },
    { type: HomePageBlockType.LATEST_NEWS, title: 'Останні новини', position: 2 },
    { type: HomePageBlockType.GAMES, title: 'Ігрові сесії', position: 3 },
    { type: HomePageBlockType.GAME_SYSTEMS, title: 'Ігрові системи', position: 4 },
    { type: HomePageBlockType.HELP, title: 'Допомога', position: 6 },
  ];

  for (const def of blockDefs) {
    const existing = await prisma.homePageBlock.findFirst({ where: { type: def.type } });
    if (!existing) {
      await prisma.homePageBlock.create({ data: { ...def, enabled: true } });
    }
  }

  console.log(`✅ Blocks     : ${blockDefs.map((b) => b.type).join(', ')}`);

  // ── Game Systems ──────────────────────────────────────────────────────────────
  const systemDefs = [
    {
      slug: 'dnd-5e',
      title: 'Dungeons & Dragons 5e',
      shortDescription: 'Найпопулярніша TTRPG у світі. Ідеально для початківців і досвідчених гравців.',
      description: `Dungeons & Dragons 5-та редакція — найвідоміша настільна рольова гра у світі, видана компанією Wizards of the Coast у 2014 році. Система пропонує багатий фентезійний світ із сотнями рас, класів і заклинань.\n\nГра відома своєю доступністю: базові правила безплатні, а гравці без досвіду можуть розібратися у механіках за кілька годин. Система підтримує будь-який стиль — від легкого рольового відіграшу до тактичних бойових сутичок.\n\nD&D 5e має величезну спільноту, тисячі додаткових матеріалів, офіційних пригод і стороннього контенту (OGL). Ідеальний вибір для першої кампанії.`,
      complexity: 'Початківець',
      genre: 'Фентезі',
      tags: ['фентезі', 'класика', 'дракони', 'чарування', 'пригоди'],
      status: ContentStatus.PUBLISHED,
      publishedAt: new Date('2026-01-15'),
    },
    {
      slug: 'pathfinder-2e',
      title: 'Pathfinder 2e',
      shortDescription: 'Глибока тактична система для тих, хто хоче максимальний контроль над персонажем.',
      description: `Pathfinder Друга Редакція — повнофункціональна TTRPG від Paizo Publishing, яка пропонує найглибшу механіку кастомізації персонажів серед усіх рольових систем. Три дії за хід, сотні фітів і архетипів, деталізована бойова система.\n\nСистема побудована навколо концепції «трьох дій» — кожен персонаж за свій хід може виконати до трьох дій, що дає величезну тактичну гнучкість. Бойові зустрічі вимагають стратегічного мислення.\n\nPathfinder 2e ідеально підходить для досвідчених гравців, які хочуть детально опрацювати механіку свого персонажа і насолодитися складними тактичними боями.`,
      complexity: 'Просунутий',
      genre: 'Фентезі',
      tags: ['фентезі', 'тактика', 'кастомізація', 'героїчне фентезі', 'паладини'],
      status: ContentStatus.PUBLISHED,
      publishedAt: new Date('2026-01-20'),
    },
    {
      slug: 'call-of-cthulhu',
      title: 'Call of Cthulhu',
      shortDescription: 'Горор і розслідування в дусі Лавкрафта. Гравці — не герої, а жертви невідомого.',
      description: `Call of Cthulhu — культова RPG від Chaosium, заснована на творах Говарда Філіпса Лавкрафта. Гравці беруть роль слідчих, детективів і дослідників 1920-х, які зіштовхуються з незрозумілими жахами Зовнішніх богів.\n\nНа відміну від класичних героїчних TTRPG, CoC будується навколо розслідування та виживання. Персонажі слабкі, боятися нормально, а зустріч з монстром може закінчитися летально або психологічним зламом (Sanity system).\n\nГра ідеально підходить для одноактних пригод і коротких кампаній. Атмосфера напруги, таємниці і безнадії — головні кити системи.`,
      complexity: 'Середній',
      genre: 'Горор/Розслідування',
      tags: ['горор', 'лавкрафт', 'розслідування', '1920-ті', 'безумство'],
      status: ContentStatus.PUBLISHED,
      publishedAt: new Date('2026-02-01'),
    },
    {
      slug: 'mork-borg',
      title: 'Mork Borg',
      shortDescription: 'Апокаліптичний чорний метал у форматі TTRPG. Коротко. Жорстоко. Художньо.',
      description: `Mork Borg — авангардна OSR-система від Free League Publishing, лауреат ENNIE Awards. Гра розгортається у світі, що наближається до кінця: темне фентезі, чорний метал і художній дизайн у кожному рядку тексту.\n\nПравила вкладаються у кілька сторінок. Персонажі смертні, ресурси обмежені, кожна битва може бути останньою. Система заохочує імпровізацію і стрімкий ігровий процес.\n\nMork Borg ідеально для одноактних пригод і гравців, які хочуть відчути гострий адреналін від смертельного данжену без багатогодинного вивчення правил.`,
      complexity: 'Початківець',
      genre: 'Дарк-фентезі',
      tags: ['дарк-фентезі', 'апокаліпсис', 'osr', 'авангард', 'короткі кампанії'],
      status: ContentStatus.PUBLISHED,
      publishedAt: new Date('2026-02-10'),
    },
    {
      slug: 'vampire-the-masquerade',
      title: 'Vampire: The Masquerade',
      shortDescription: 'Готичний міський горор. Ви — вампір, що намагається зберегти людяність у темному світі.',
      description: `Vampire: The Masquerade (VtM) — одна з найвпливовіших TTRPG всіх часів від Paradox Interactive / White Wolf. Гравці беруть роль вампірів (Kindred), занурених у складну політику кланів і секретне суспільство у сучасних містах.\n\nГра фокусується на нарративі і моральних дилемах: кожна дія може наблизити персонажа до втрати Людяності (Humanity) і перетворення на звіра. Бойові сутички небажані — дипломатія і маніпуляції ефективніші.\n\nVtM ідеально для зрілих гравців, які люблять складні характери, міську інтригу і нарративний стиль гри. Система «World of Darkness» є однією з найбагатших по лору.`,
      complexity: 'Просунутий',
      genre: 'Готичний горор',
      tags: ['вампіри', 'готика', 'місто', 'нарратив', 'world of darkness'],
      status: ContentStatus.PUBLISHED,
      publishedAt: new Date('2026-02-15'),
    },
  ];

  const systemMap: Record<string, string> = {};
  for (const def of systemDefs) {
    const sys = await prisma.gameSystem.upsert({
      where: { slug: def.slug },
      update: {},
      create: def,
    });
    systemMap[def.slug] = sys.id;
  }
  console.log(`✅ Systems    : ${systemDefs.map((s) => s.title).join(', ')}`);

  if (!plan.includeDemoGamesAndCommunities || !gm) {
    console.log('ℹ️  Демо-ігри та демо-спільноти пропущено.');
    console.log('\n🎉 Seed completed successfully!');
    return;
  }

  // ── Sample games ────────────────────────────────────────────────────────────
  const dndSystem = await prisma.gameSystem.findUnique({ where: { slug: 'dnd-5e' } });
  const gameDefs = [
    {
      slug: 'oneshot-dragon-lair',
      title: 'One-Shot: Лігво дракона',
      description: 'Класична односесійна пригода для 4-5 гравців рівня 5. Підходить для новачків.',
      status: GameStatus.OPEN,
      maxPlayers: 5,
      startsAt: new Date('2026-07-15T18:00:00Z'),
      masterId: gm.id,
      gameSystemId: dndSystem?.id ?? null,
    },
    {
      slug: 'weekly-cos-campaign',
      title: 'Щотижнева кампанія Call of Cthulhu',
      description: 'Довга кампанія у стилі lovecraftian horror. Досвідчені гравці, 3/5 місць зайнято.',
      status: GameStatus.OPEN,
      maxPlayers: 5,
      startsAt: new Date('2026-07-20T19:00:00Z'),
      masterId: gm.id,
      gameSystemId: null,
    },
  ];

  for (const def of gameDefs) {
    await prisma.game.upsert({
      where: { slug: def.slug },
      update: {},
      create: def,
    });
  }
  console.log(`✅ Games      : ${gameDefs.map((g) => g.title).join(', ')}`);

  const communityDefs = [
    {
      slug: 'kyiv-rpg-club',
      name: 'Київський RPG-клуб',
      description: 'Спільнота настільних рольовиків Києва: щотижневі зустрічі, open tables, обмін досвідом.',
    },
    {
      slug: 'online-vtt-players',
      name: 'Online VTT Players',
      description: 'Гравці для онлайн-сесій через Roll20 та Foundry. Англомовні та україномовні столи.',
    },
  ];

  for (const def of communityDefs) {
    await prisma.community.upsert({
      where: { slug: def.slug },
      update: {},
      create: def,
    });
  }
  console.log(`✅ Communities: ${communityDefs.map((c) => c.name).join(', ')}`);

  console.log('\n🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
