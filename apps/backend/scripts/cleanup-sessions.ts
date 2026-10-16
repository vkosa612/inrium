/**
 * Очищення старих сесій (прострочені та відкликані записи, що накопичуються в таблиці Session).
 *
 *   pnpm --filter @inrium/backend sessions:cleanup               # dry-run: лише показує кількість
 *   pnpm --filter @inrium/backend sessions:cleanup -- --apply    # видалити
 *   ... -- --retention-days=30                                   # скільки днів тримати для розслідувань (за замовч. 30)
 *
 * Видаляються лише сесії, які ВЖЕ непридатні (прострочені або відкликані) і старші за retention.
 * Активні сесії та сесії, що ще в межах retention (потрібні для виявлення повторного використання refresh), не чіпаються.
 */
import { PrismaClient } from '@prisma/client';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const retentionDays = Number(args.find((a) => a.startsWith('--retention-days='))?.split('=')[1] ?? 30);

async function main(): Promise<void> {
  if (!Number.isFinite(retentionDays) || retentionDays < 1) {
    throw new Error('--retention-days має бути числом ≥ 1');
  }
  const prisma = new PrismaClient();
  try {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const where = {
      OR: [{ expiresAt: { lt: cutoff } }, { revokedAt: { lt: cutoff } }],
    };

    const count = await prisma.session.count({ where });
    if (!apply) {
      console.log(`Dry-run: до видалення ${count} сесій (старших за ${retentionDays} дн.). Додайте --apply, щоб видалити.`);
      return;
    }
    const result = await prisma.session.deleteMany({ where });
    console.log(`Видалено сесій: ${result.count}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
