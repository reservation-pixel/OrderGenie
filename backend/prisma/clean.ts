import { PrismaClient, DataSource } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Removes only seed-generated demo data, leaving real Petpooja-synced records and
 * core config (Outlets, Users, Roles, PetpoojaApiConfig, SyncSchedule) untouched.
 * Discriminators: seeded Sales/PurchaseOrders have no petpoojaOrderId/petpoojaPurchaseId;
 * seeded Inventory/InventoryTransaction rows are tagged source=STUB.
 */
async function main() {
  const dummySales = await prisma.sale.deleteMany({ where: { petpoojaOrderId: null } });
  console.log(`Deleted ${dummySales.count} seed Sale rows (SaleItem rows cascade).`);

  const dummyInventory = await prisma.inventory.deleteMany({ where: { source: DataSource.STUB } });
  console.log(`Deleted ${dummyInventory.count} seed Inventory rows.`);

  const dummyTransactions = await prisma.inventoryTransaction.deleteMany({ where: { source: DataSource.STUB } });
  console.log(`Deleted ${dummyTransactions.count} seed InventoryTransaction rows.`);

  const dummyPOs = await prisma.purchaseOrder.deleteMany({ where: { petpoojaPurchaseId: null } });
  console.log(`Deleted ${dummyPOs.count} seed PurchaseOrder rows (PurchaseOrderItem rows cascade).`);

  const orphanVendors = await prisma.vendor.deleteMany({
    where: { petpoojaSupplierId: null, purchaseOrders: { none: {} } },
  });
  console.log(`Deleted ${orphanVendors.count} orphaned seed Vendor rows.`);

  console.log('Done. Outlets, Users, Roles, PetpoojaApiConfig, SyncSchedule, and any real Petpooja-synced data were left untouched.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
