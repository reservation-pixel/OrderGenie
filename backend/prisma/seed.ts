import { PrismaClient, RoleName, OutletType, DataSource, PurchaseOrderStatus, InventoryTransactionType, ApiType, SyncType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';
import { encrypt } from '../src/utils/encryption';
import { DEFAULT_CRON_EXPRESSIONS } from '../src/config/constants';

const prisma = new PrismaClient();

faker.seed(20260806);

// Outlets extracted from the Petpooja email threads (apidocs/apidocs.txt).
// `brand` groupings for the non-Aiko/Capiche/Bookends outlets are an inferred
// best guess (they share sync-code activation batches) — correct via Settings
// if the real brand structure differs.
const KNOWN_OUTLETS = [
  // salesSyncCode is an UNVERIFIED candidate (from a partially-fabricated reference doc) —
  // a live call succeeds and its restaurantid matches this outlet's RID, but the response's
  // res_name/address are Aiko (Surat)'s. Kept in so it's testable via Settings > API Explorer;
  // don't trust it for real Sales sync until confirmed against real order data.
  { name: 'Aiko (Ahmedabad)', brand: 'Aiko', rid: '134691', city: 'Ahmedabad', type: OutletType.OUTLET, salesSyncCode: 'z2ogsrb0', inventorySyncCode: null },
  { name: 'Aiko (Surat)', brand: 'Aiko', rid: '73492', city: 'Surat', type: OutletType.OUTLET, salesSyncCode: '1ce6t782', inventorySyncCode: null },
  { name: 'Bookends Mobile', brand: 'Bookends', rid: '359628', city: null, type: OutletType.OUTLET, salesSyncCode: 'yvop12cq3m', inventorySyncCode: null },
  { name: 'Capiche (Ahmedabad)', brand: 'Capiche', rid: '353369', city: 'Ahmedabad', type: OutletType.OUTLET, salesSyncCode: 'qvy5ze7s0c', inventorySyncCode: null },
  { name: 'Capiche (Piplod)', brand: 'Capiche', rid: '21492', city: 'Surat', type: OutletType.OUTLET, salesSyncCode: 'ukrhzywj', inventorySyncCode: null },
  { name: 'Capiche (Vesu)', brand: 'Capiche', rid: '344447', city: 'Surat', type: OutletType.OUTLET, salesSyncCode: '4tmaivhj', inventorySyncCode: null },
  { name: 'Capiche Ahmedabad 2.0', brand: 'Capiche', rid: '419174', city: 'Ahmedabad', type: OutletType.OUTLET, salesSyncCode: 'ihtnr4a7cy', inventorySyncCode: null },
  { name: 'Ahmedabad Bakery', brand: 'KG', rid: '410700', city: 'Ahmedabad', type: OutletType.OUTLET, salesSyncCode: null, inventorySyncCode: 'eh0x8kt3d2' },
  { name: 'Ahmedabad Store', brand: 'KG', rid: '358609', city: 'Ahmedabad', type: OutletType.OUTLET, salesSyncCode: null, inventorySyncCode: '4pwgfxrzs2' },
  { name: 'Family', brand: 'KG', rid: '394370', city: null, type: OutletType.OUTLET, salesSyncCode: null, inventorySyncCode: 'x74bivacjk' },
  { name: 'KG Birthday Cake', brand: 'KG', rid: '383611', city: null, type: OutletType.OUTLET, salesSyncCode: null, inventorySyncCode: '9zrehnckm6' },
  { name: 'ODC', brand: 'KG', rid: '423523', city: null, type: OutletType.OUTLET, salesSyncCode: null, inventorySyncCode: 'jprtvkud2b' },
  { name: 'ODC Store', brand: 'KG', rid: '404029', city: null, type: OutletType.OUTLET, salesSyncCode: null, inventorySyncCode: '8okipxz7r5' },
  { name: 'Surat Bakery', brand: 'KG', rid: '343448', city: 'Surat', type: OutletType.OUTLET, salesSyncCode: null, inventorySyncCode: 'cjkf5gi2' },
  { name: 'Surat Store', brand: 'KG', rid: '117185', city: 'Surat', type: OutletType.OUTLET, salesSyncCode: null, inventorySyncCode: 'd6pbazgs' },
  { name: 'Ahmedabad Prep Kitchen', brand: 'KG', rid: '410150', city: 'Ahmedabad', type: OutletType.PREP_KITCHEN, salesSyncCode: null, inventorySyncCode: 'opw2xhc6vg' },
  { name: 'Surat Prep Kitchen', brand: 'KG', rid: '376017', city: 'Surat', type: OutletType.PREP_KITCHEN, salesSyncCode: null, inventorySyncCode: 'kv4roawcjf' },
  { name: 'Accounts Department', brand: 'Internal', rid: '451175', city: null, type: OutletType.ADMIN, salesSyncCode: null, inventorySyncCode: null },
] as const;

const ITEM_CATALOG = [
  { name: 'Margherita Pizza', category: 'Pizza', price: 249 },
  { name: 'Farmhouse Pizza', category: 'Pizza', price: 299 },
  { name: 'Chocolate Truffle Cake', category: 'Cakes', price: 450 },
  { name: 'Red Velvet Cake', category: 'Cakes', price: 480 },
  { name: 'Butter Croissant', category: 'Bakery', price: 90 },
  { name: 'Blueberry Muffin', category: 'Bakery', price: 110 },
  { name: 'Cappuccino', category: 'Beverages', price: 150 },
  { name: 'Cold Coffee', category: 'Beverages', price: 170 },
  { name: 'Paneer Tikka Sandwich', category: 'Sandwiches', price: 199 },
  { name: 'Club Sandwich', category: 'Sandwiches', price: 229 },
  { name: 'Pasta Alfredo', category: 'Pasta', price: 279 },
  { name: 'Pasta Arrabbiata', category: 'Pasta', price: 259 },
  { name: 'Chicken Burger', category: 'Burgers', price: 219 },
  { name: 'Veg Burger', category: 'Burgers', price: 179 },
  { name: 'French Fries', category: 'Sides', price: 129 },
  { name: 'Garlic Bread', category: 'Sides', price: 149 },
  { name: 'Brownie with Ice Cream', category: 'Desserts', price: 199 },
  { name: 'Tiramisu', category: 'Desserts', price: 249 },
  { name: 'Masala Chai', category: 'Beverages', price: 60 },
  { name: 'Fresh Lime Soda', category: 'Beverages', price: 90 },
];

const PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'Swiggy', 'Zomato'];
const VENDOR_NAMES = ['Ambika Dairy Suppliers', 'Gujarat Fresh Produce', 'Shree Packaging Co.', 'National Beverages Distributor', 'Prime Meats & Poultry', 'Metro Bakery Ingredients'];

function decimalRound(n: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(n * factor) / factor;
}

async function seedRolesAndAdmin() {
  const roleRecords = await Promise.all(
    (Object.values(RoleName) as RoleName[]).map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: {
          name,
          description:
            name === 'ADMIN'
              ? 'Full access: users, outlets, Petpooja config, all reports'
              : name === 'MANAGEMENT'
                ? 'Dashboards, outlet comparison, report exports'
                : 'Single assigned outlet: sales, inventory, purchase orders',
        },
      })
    )
  );
  const adminRole = roleRecords.find((r) => r.name === 'ADMIN')!;

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@ordergenie.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      name: 'OrderGenie Admin',
      roleId: adminRole.id,
      isActive: true,
    },
  });

  return { roleRecords, admin };
}

async function seedOutlets() {
  const outlets = [];
  for (const o of KNOWN_OUTLETS) {
    const outlet = await prisma.outlet.upsert({
      where: { rid: o.rid },
      update: {},
      create: {
        name: o.name,
        brand: o.brand,
        rid: o.rid,
        outletType: o.type,
        city: o.city ?? undefined,
        salesSyncCode: o.salesSyncCode ?? undefined,
        inventorySyncCode: o.inventorySyncCode ?? undefined,
        isActive: true,
      },
    });
    outlets.push(outlet);
  }
  return outlets;
}

async function seedSalesForOutlet(outletId: string, days: number) {
  const now = new Date();
  let invoiceCounter = 1;

  for (let dayOffset = days - 1; dayOffset >= 0; dayOffset--) {
    const day = new Date(now);
    day.setDate(day.getDate() - dayOffset);

    const ordersToday = faker.number.int({ min: 15, max: 45 });

    for (let i = 0; i < ordersToday; i++) {
      const hour = faker.number.int({ min: 9, max: 22 });
      const minute = faker.number.int({ min: 0, max: 59 });
      const orderDateTime = new Date(day);
      orderDateTime.setHours(hour, minute, 0, 0);

      const lineItemCount = faker.number.int({ min: 1, max: 5 });
      const chosenItems = faker.helpers.arrayElements(ITEM_CATALOG, lineItemCount);

      let gross = 0;
      const items = chosenItems.map((item) => {
        const quantity = faker.number.int({ min: 1, max: 3 });
        const price = item.price;
        const lineGross = price * quantity;
        const discount = decimalRound(lineGross * faker.number.float({ min: 0, max: 0.1 }));
        const tax = decimalRound((lineGross - discount) * 0.05);
        const total = decimalRound(lineGross - discount + tax);
        gross += lineGross;
        return {
          itemName: item.name,
          category: item.category,
          quantity,
          price,
          discount,
          tax,
          total,
        };
      });

      const discountAmount = decimalRound(items.reduce((s, i) => s + i.discount, 0));
      const taxAmount = decimalRound(items.reduce((s, i) => s + i.tax, 0));
      const netAmount = decimalRound(gross - discountAmount + taxAmount);

      await prisma.sale.create({
        data: {
          outletId,
          invoiceNumber: `INV-${outletId.slice(-4).toUpperCase()}-${String(invoiceCounter++).padStart(5, '0')}`,
          orderDateTime,
          orderDate: new Date(day.getFullYear(), day.getMonth(), day.getDate()),
          customerName: faker.datatype.boolean(0.6) ? faker.person.fullName() : null,
          customerPhone: faker.datatype.boolean(0.6) ? faker.phone.number({ style: 'national' }) : null,
          grossAmount: decimalRound(gross),
          discountAmount,
          taxAmount,
          netAmount,
          paymentMode: faker.helpers.arrayElement(PAYMENT_MODES),
          orderType: faker.helpers.arrayElement(['Dine-in', 'Takeaway', 'Delivery']),
          items: { create: items },
        },
      });
    }
  }
}

async function seedInventoryForOutlet(outletId: string, days: number) {
  const now = new Date();
  for (let dayOffset = days - 1; dayOffset >= 0; dayOffset--) {
    const day = new Date(now);
    day.setDate(day.getDate() - dayOffset);
    const stockDate = new Date(day.getFullYear(), day.getMonth(), day.getDate());

    const items = faker.helpers.arrayElements(ITEM_CATALOG, 12);
    for (const item of items) {
      const opening = faker.number.int({ min: 5, max: 100 });
      const purchased = faker.number.int({ min: 0, max: 30 });
      const consumed = faker.number.int({ min: 0, max: opening + purchased });
      const closing = Math.max(0, opening + purchased - consumed);
      const unitValue = decimalRound(item.price * 0.4);
      const lowStockThreshold = 10;

      await prisma.inventory.upsert({
        where: { outletId_itemName_stockDate: { outletId, itemName: item.name, stockDate } },
        update: {},
        create: {
          outletId,
          itemName: item.name,
          category: item.category,
          unit: 'pcs',
          store: 'Main Store',
          openingStock: opening,
          purchasedQty: purchased,
          consumedQty: consumed,
          closingStock: closing,
          currentStock: closing,
          unitValue,
          stockValue: decimalRound(closing * unitValue),
          lowStockThreshold,
          isLowStock: closing < lowStockThreshold,
          stockDate,
          source: DataSource.STUB,
        },
      });

      await prisma.inventoryTransaction.create({
        data: {
          outletId,
          itemName: item.name,
          transactionType: InventoryTransactionType.CONSUMPTION,
          quantity: consumed,
          unit: 'pcs',
          transactionDate: stockDate,
          source: DataSource.STUB,
        },
      });
      if (purchased > 0) {
        await prisma.inventoryTransaction.create({
          data: {
            outletId,
            itemName: item.name,
            transactionType: InventoryTransactionType.PURCHASE,
            quantity: purchased,
            unit: 'pcs',
            transactionDate: stockDate,
            source: DataSource.STUB,
          },
        });
      }
    }
  }
}

async function seedVendors() {
  return Promise.all(
    VENDOR_NAMES.map((name) =>
      prisma.vendor.create({
        data: {
          name,
          contactPerson: faker.person.fullName(),
          phone: faker.phone.number({ style: 'national' }),
          email: faker.internet.email({ provider: 'example.com' }),
          address: faker.location.streetAddress(),
        },
      })
    )
  );
}

async function seedPurchaseOrdersForOutlet(outletId: string, outletRid: string, vendorIds: string[]) {
  const count = faker.number.int({ min: 2, max: 4 });
  for (let i = 0; i < count; i++) {
    const orderDate = faker.date.recent({ days: 30 });
    const expectedDate = new Date(orderDate);
    expectedDate.setDate(expectedDate.getDate() + faker.number.int({ min: 2, max: 10 }));
    const status = faker.helpers.arrayElement(Object.values(PurchaseOrderStatus));

    const lineItemCount = faker.number.int({ min: 2, max: 6 });
    const items = Array.from({ length: lineItemCount }).map(() => {
      const quantity = faker.number.int({ min: 5, max: 50 });
      const rate = faker.number.float({ min: 20, max: 500, fractionDigits: 2 });
      const amount = decimalRound(quantity * rate);
      const cgst = decimalRound(amount * 0.025);
      const sgst = decimalRound(amount * 0.025);
      const receivedQty = status === 'RECEIVED' ? quantity : status === 'PARTIALLY_RECEIVED' ? Math.floor(quantity / 2) : 0;
      return {
        itemName: faker.commerce.productName(),
        quantity,
        unit: 'kg',
        rate,
        amount,
        cgst,
        sgst,
        igst: 0,
        cess: 0,
        receivedQty,
        pendingQty: quantity - receivedQty,
      };
    });

    const totalAmount = decimalRound(items.reduce((s, i) => s + i.amount, 0));
    const taxAmount = decimalRound(items.reduce((s, i) => s + i.cgst + i.sgst, 0));

    await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-${outletRid}-${String(i + 1).padStart(3, '0')}-${orderDate.getFullYear()}`,
        outletId,
        vendorId: faker.helpers.arrayElement(vendorIds),
        invoiceNumber: faker.string.alphanumeric(8).toUpperCase(),
        status,
        totalAmount: decimalRound(totalAmount + taxAmount),
        taxAmount,
        orderDate,
        expectedDate,
        receivedDate: status === 'RECEIVED' ? expectedDate : null,
        items: { create: items },
      },
    });
  }
}

async function seedPetpoojaConfig() {
  const salesConfigured = Boolean(process.env.PETPOOJA_SALES_APP_KEY);
  const purchaseConfigured = Boolean(process.env.PETPOOJA_PURCHASE_APP_KEY);

  const rows: Array<{ apiType: ApiType; configured: boolean; appKey?: string; appSecret?: string; accessToken?: string; cookie?: string }> = [
    {
      apiType: ApiType.SALES,
      configured: salesConfigured,
      appKey: process.env.PETPOOJA_SALES_APP_KEY,
      appSecret: process.env.PETPOOJA_SALES_APP_SECRET,
      accessToken: process.env.PETPOOJA_SALES_ACCESS_TOKEN,
      cookie: process.env.PETPOOJA_SALES_COOKIE,
    },
    {
      apiType: ApiType.PURCHASE,
      configured: purchaseConfigured,
      appKey: process.env.PETPOOJA_PURCHASE_APP_KEY,
      appSecret: process.env.PETPOOJA_PURCHASE_APP_SECRET,
      accessToken: process.env.PETPOOJA_PURCHASE_ACCESS_TOKEN,
    },
    { apiType: ApiType.INVENTORY, configured: false },
    { apiType: ApiType.TRANSFER, configured: false },
  ];

  for (const row of rows) {
    await prisma.petpoojaApiConfig.upsert({
      where: { apiType: row.apiType },
      update: {},
      create: {
        apiType: row.apiType,
        isConfigured: row.configured,
        appKeyEncrypted: row.appKey ? encrypt(row.appKey) : null,
        appSecretEncrypted: row.appSecret ? encrypt(row.appSecret) : null,
        accessTokenEncrypted: row.accessToken ? encrypt(row.accessToken) : null,
        cookieEncrypted: row.cookie ? encrypt(row.cookie) : null,
        notes:
          row.apiType === 'INVENTORY' || row.apiType === 'TRANSFER'
            ? 'Endpoint/schema not yet documented by Petpooja — sync runs against a stub until configured.'
            : null,
      },
    });
  }
}

async function seedSyncSchedules() {
  const schedules: Array<{ syncType: SyncType; cron: string }> = [
    { syncType: SyncType.SALES, cron: DEFAULT_CRON_EXPRESSIONS.SALES },
    { syncType: SyncType.INVENTORY, cron: DEFAULT_CRON_EXPRESSIONS.INVENTORY },
    { syncType: SyncType.PURCHASE, cron: DEFAULT_CRON_EXPRESSIONS.PURCHASE },
    { syncType: SyncType.HISTORICAL, cron: DEFAULT_CRON_EXPRESSIONS.HISTORICAL },
  ];
  for (const s of schedules) {
    await prisma.syncSchedule.upsert({
      where: { syncType: s.syncType },
      update: {},
      create: { syncType: s.syncType, cronExpression: s.cron, isEnabled: true },
    });
  }
}

async function main() {
  console.log('Seeding roles + admin user...');
  const { admin } = await seedRolesAndAdmin();

  console.log('Seeding outlets...');
  const outlets = await seedOutlets();

  const existingSales = await prisma.sale.count();
  if (existingSales === 0) {
    console.log('Seeding sales + inventory + purchase orders (this may take a minute)...');
    const vendors = await seedVendors();
    const vendorIds = vendors.map((v) => v.id);

    for (const outlet of outlets.filter((o) => o.outletType !== OutletType.ADMIN)) {
      await seedSalesForOutlet(outlet.id, 30);
      await seedInventoryForOutlet(outlet.id, 7);
      await seedPurchaseOrdersForOutlet(outlet.id, outlet.rid, vendorIds);
    }
  } else {
    console.log('Sales already seeded, skipping transactional data.');
  }

  console.log('Seeding Petpooja API config...');
  await seedPetpoojaConfig();

  console.log('Seeding sync schedules...');
  await seedSyncSchedules();

  console.log('Seeding notification settings...');
  await prisma.notificationSetting.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id, lowStockAlerts: true, syncFailureAlerts: true, dailySummaryEmail: false },
  });

  console.log('Seed complete.');
  console.log(`Admin login: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
