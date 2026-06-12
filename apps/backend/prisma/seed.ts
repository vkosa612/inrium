import {
  ContentStatus,
  ContentType,
  HomePageBlockType,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

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

  // ── Users ────────────────────────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@inrium.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin12345!';
  const editorEmail = process.env.SEED_EDITOR_EMAIL ?? 'editor@inrium.local';
  const editorPassword = process.env.SEED_EDITOR_PASSWORD ?? 'Editor12345!';

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, SALT_ROUNDS),
      displayName: 'INRIUM Admin',
      role: UserRole.ADMIN,
    },
  });

  const editor = await prisma.user.upsert({
    where: { email: editorEmail },
    update: {},
    create: {
      email: editorEmail,
      passwordHash: await bcrypt.hash(editorPassword, SALT_ROUNDS),
      displayName: 'INRIUM Editor',
      role: UserRole.EDITOR,
    },
  });

  console.log(`✅ Users     : ${admin.email} (ADMIN), ${editor.email} (EDITOR)`);

  // ── Categories ────────────────────────────────────────────────────────────────
  const catDefs = [
    { name: 'Новини', slug: 'news', type: ContentType.NEWS },
    { name: 'Статті', slug: 'articles', type: ContentType.ARTICLE },
    { name: 'Ігрові системи', slug: 'game-systems', type: ContentType.GAME_SYSTEM },
    { name: 'Набори', slug: 'kits', type: ContentType.KIT },
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
      '## Ласкаво просимо до INRIUM!\n\nINRIUM — це нова платформа для спільноти любителів настільних рольових ігор. Тут ви знайдете статті, ігрові системи, набори для майстрів і все необхідне для незабутніх пригод.\n\n### Що вас чекає\n\n- Огляди ігрових систем\n- Статті для новачків і досвідчених майстрів\n- Набори для швидкого старту\n- Можливість знайти групу для гри',
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

  // KITS ×2
  await upsertContent({
    type: ContentType.KIT,
    status: ContentStatus.PUBLISHED,
    title: 'Набір майстра для першої гри',
    slug: 'first-game-gm-kit',
    excerpt: 'Усе що потрібно майстру для проведення першої сесії: схеми, підказки, готові зустрічі.',
    content:
      "## Набір майстра-початківця\n\n### Що всередині\n\n- Схема першої сесії (хук → зав'язка → кульмінація)\n- 10 готових NPC з іменами та мотивацією\n- 5 бойових зустрічей різної складності\n- Генератор таверн\n- Підказки з нарації та управління темпом",
    isFeatured: true,
    showOnHomePage: true,
    publishedAt: now,
    authorId: editor.id,
    categoryId: cats['kits'],
    tagIds: [tags['gm'], tags['beginners'], tags['dnd']],
  });

  await upsertContent({
    type: ContentType.KIT,
    status: ContentStatus.PUBLISHED,
    title: 'Набір для one-shot пригод',
    slug: 'one-shot-adventure-kit',
    excerpt: 'Готові матеріали для захоплюючої one-shot пригоди за один вечір.',
    content:
      '## One-Shot Kit\n\nПовний набір для самодостатньої пригоди на один вечір.\n\n### Включено\n\n- 3 сценарії різних жанрів\n- Преґенеровані персонажі\n- Карти та схеми локацій\n- Швидкі правила для нових гравців',
    isFeatured: false,
    showOnHomePage: true,
    publishedAt: now,
    authorId: editor.id,
    categoryId: cats['kits'],
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

  console.log(`✅ Content    : 2 news, 2 articles, 4 game systems, 2 kits, 2 help pages`);

  // ── Home page blocks ──────────────────────────────────────────────────────────
  const blockDefs = [
    { type: HomePageBlockType.HERO, title: 'Головний банер', position: 0 },
    { type: HomePageBlockType.FEATURED_GRID, title: 'Вибране', position: 1 },
    { type: HomePageBlockType.LATEST_NEWS, title: 'Останні новини', position: 2 },
    { type: HomePageBlockType.GAME_SYSTEMS, title: 'Ігрові системи', position: 3 },
    { type: HomePageBlockType.KITS, title: 'Набори', position: 4 },
    { type: HomePageBlockType.HELP, title: 'Допомога', position: 5 },
  ];

  for (const def of blockDefs) {
    const existing = await prisma.homePageBlock.findFirst({ where: { type: def.type } });
    if (!existing) {
      await prisma.homePageBlock.create({ data: { ...def, enabled: true } });
    }
  }

  console.log(`✅ Blocks     : ${blockDefs.map((b) => b.type).join(', ')}`);
  console.log('\n🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
