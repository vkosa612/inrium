/**
 * Пошук і (за явним прапором) видалення «осиротілих» завантажень — файлів у UPLOADS_DIR/images,
 * на які більше немає посилань у БД.
 *
 *   pnpm --filter @inrium/backend uploads:cleanup                 # dry-run (нічого не видаляє)
 *   pnpm --filter @inrium/backend uploads:cleanup -- --apply      # видалити
 *   ... -- --min-age-days=14                                      # не чіпати файли молодші за N днів (за замовч. 7)
 *
 * Безпечність: за замовчуванням dry-run; файли молодші за min-age не чіпаються (щоб не зачепити щойно
 * завантажене, але ще не збережене в формі); посилання шукаються у всіх полях-URL, а також у JSON блоків
 * головної сторінки та тексті контенту.
 */
import { PrismaClient } from '@prisma/client';
import { readdir, stat, unlink } from 'fs/promises';
import { join, relative, resolve, sep } from 'path';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const minAgeDays = Number(args.find((a) => a.startsWith('--min-age-days='))?.split('=')[1] ?? 7);

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

async function main(): Promise<void> {
  const uploadsRoot = resolve(process.env.UPLOADS_DIR ?? 'uploads');
  const imagesRoot = join(uploadsRoot, 'images');
  const prisma = new PrismaClient();

  try {
    const [users, content, games, systems, kits, communities, blocks] = await Promise.all([
      prisma.user.findMany({ select: { avatarUrl: true } }),
      prisma.contentItem.findMany({ select: { coverImageUrl: true, content: true, excerpt: true } }),
      prisma.game.findMany({ select: { coverImageUrl: true, description: true } }),
      prisma.gameSystem.findMany({ select: { imageUrl: true } }),
      prisma.kit.findMany({ select: { imageUrl: true } }),
      prisma.community.findMany({ select: { coverImageUrl: true } }),
      prisma.homePageBlock.findMany(),
    ]);

    const corpus = JSON.stringify({ users, content, games, systems, kits, communities, blocks });
    const cutoff = Date.now() - minAgeDays * 24 * 60 * 60 * 1000;

    let total = 0;
    let orphans = 0;
    let bytes = 0;

    try {
      await stat(imagesRoot);
    } catch {
      console.log(`Каталог ${imagesRoot} не існує — нічого перевіряти.`);
      return;
    }

    for await (const file of walk(imagesRoot)) {
      total += 1;
      const url = `/uploads/${relative(uploadsRoot, file).split(sep).join('/')}`;
      const info = await stat(file);
      if (corpus.includes(url) || info.mtimeMs > cutoff) continue;

      orphans += 1;
      bytes += info.size;
      if (apply) {
        await unlink(file);
        console.log(`видалено  ${url}`);
      } else {
        console.log(`orphan    ${url} (${info.size} B)`);
      }
    }

    console.log(
      `\nПеревірено файлів: ${total}; осиротілих: ${orphans} (${(bytes / 1024).toFixed(1)} KiB). ` +
        (apply ? 'Видалено.' : 'Dry-run: нічого не видалено (додайте --apply).'),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
