import { PrismaClient } from '@prisma/client';

const RAILWAY_URL = process.argv[2];
if (!RAILWAY_URL) {
  console.error('Usage: npx tsx scripts/migrate-classA-to-railway.ts <railway-db-url>');
  process.exit(1);
}

const local = new PrismaClient();
const remote = new PrismaClient({ datasources: { db: { url: RAILWAY_URL } } });

async function main() {
  const classAItems = await local.classAItem.findMany();
  const recipes = await local.reconciliationRecipe.findMany();

  console.log(`Local: ${classAItems.length} ClassAItem, ${recipes.length} ReconciliationRecipe`);

  const classARes = await remote.classAItem.createMany({
    data: classAItems.map((c) => ({ brand: c.brand, type: c.type, value: c.value, createdAt: c.createdAt })),
    skipDuplicates: true,
  });
  console.log(`ClassAItem: inserted ${classARes.count} (rest skipped as already present)`);

  const recipeRes = await remote.reconciliationRecipe.createMany({
    data: recipes.map((r) => ({
      brand: r.brand,
      ingredientName: r.ingredientName,
      triggerType: r.triggerType,
      triggerValues: r.triggerValues,
      qtyPerMatch: r.qtyPerMatch,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    skipDuplicates: true,
  });
  console.log(`ReconciliationRecipe: inserted ${recipeRes.count}`);

  const [finalClassA, finalRecipes] = await Promise.all([remote.classAItem.count(), remote.reconciliationRecipe.count()]);
  console.log(`Railway now has: ${finalClassA} ClassAItem, ${finalRecipes} ReconciliationRecipe`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await local.$disconnect();
    await remote.$disconnect();
  });
