import { TriggerType } from '@prisma/client';
import { runSalesSync } from '../src/services/sync/salesSync.service';

/**
 * Usage: npx tsx scripts/backfill-sales.ts YYYY-MM-DD [YYYY-MM-DD ...]
 *
 * Recovers days the cron can't reach — it only ever syncs yesterday and today, so an outage
 * longer than a day leaves a permanent hole. Needs DATABASE_URL and ENCRYPTION_KEY from the
 * target environment, since the Petpooja credentials are stored encrypted.
 */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const dates = process.argv.slice(2);

if (dates.length === 0 || !dates.every((d) => DATE_RE.test(d))) {
  console.error('Usage: npx tsx scripts/backfill-sales.ts YYYY-MM-DD [YYYY-MM-DD ...]');
  process.exit(1);
}

async function main() {
  for (const date of dates) {
    console.log(`\n=== ${date} ===`);
    const summary = await runSalesSync(TriggerType.MANUAL, new Date(`${date}T00:00:00Z`));
    console.log(JSON.stringify(summary, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
