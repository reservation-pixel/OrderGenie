import { PrismaClient } from '@prisma/client';

// One-time backfill: petpoojaCreatedAt was added after many RECEIVED purchase
// orders were already synced. Their raw Petpooja `get_purchase` response
// (including `created_on`) was already stored in rawPayload at sync time, so this
// reads it back out locally instead of re-hitting Petpooja's API.
// Usage: npx tsx scripts/backfill-petpooja-created-at.ts [database-url]

const DB_URL = process.argv[2];
const prisma = DB_URL ? new PrismaClient({ datasources: { db: { url: DB_URL } } }) : new PrismaClient();

// created_on is a full "YYYY-MM-DD HH:mm:ss" datetime, not a bare date — needs "T"
// in place of the space, not appended after it (matches purchaseMapper.ts).
function parsePetpoojaDate(value: string): Date {
  return new Date(value.includes('T') ? value : value.replace(' ', 'T'));
}

async function main() {
  const candidates = await prisma.purchaseOrder.findMany({
    where: { status: 'RECEIVED', petpoojaCreatedAt: null },
    select: { id: true, rawPayload: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const po of candidates) {
    const createdOn = (po.rawPayload as Record<string, unknown> | null)?.created_on;
    if (typeof createdOn !== 'string' || !createdOn) {
      skipped++;
      continue;
    }
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { petpoojaCreatedAt: parsePetpoojaDate(createdOn) },
    });
    updated++;
  }

  console.log(`Candidates: ${candidates.length}, updated: ${updated}, skipped (no created_on in rawPayload): ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
