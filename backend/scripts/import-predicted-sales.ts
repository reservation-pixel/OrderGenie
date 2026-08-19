/**
 * Imports a day-wise sales forecast workbook (like assets/Aug_2026_Final_Prediction_v14.xlsx)
 * into PredictedSale. Reusable — re-run against an updated forecast file to refresh the data;
 * upserts on (outletId, itemName, stockDate) so re-imports overwrite rather than duplicate.
 *
 * Usage: npx tsx scripts/import-predicted-sales.ts <path-to-xlsx>
 */
import path from 'path';
import { Workbook } from 'exceljs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Sheet name -> outlet rid. Sheet names reflect the outlet names at the time the
// forecast was built, which may no longer match the live Outlet.name (e.g. "Capiche
// Ahmedabad" / "Capiche Ahmedabad 2.0" were later renamed) — rid is the stable key.
const SHEET_TO_RID: Record<string, string> = {
  'Capiche Piplod': '21492',
  'Capiche Vesu': '344447',
  'Capiche Ahmedabad': '353369',
  'Capiche Ahmedabad 2.0': '419174',
  'Dessert - Capiche Piplod': '21492',
  'Dessert - Capiche Vesu': '344447',
  'Dessert - Capiche Ahmedabad': '353369',
  'Dessert - Capiche Ahmedabad 2.0': '419174',
  'Dessert - Aiko Surat': '73492',
  'Dessert - Aiko Ahmedabad': '134691',
  'Sushi - Aiko Surat': '73492',
  'Sushi - Aiko Ahmedabad': '134691',
  'Dimsum - Aiko Surat': '73492',
  'Dimsum - Aiko Ahmedabad': '134691',
  'Noodles - Aiko Surat': '73492',
  'Noodles - Aiko Ahmedabad': '134691',
};

const SKIP_COLUMNS = new Set(['Date', 'Day', 'Event', 'Source', 'Total Items']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HEADER_ROW = 4;

interface PendingUpsert {
  outletId: string;
  itemName: string;
  stockDate: string;
  predictedQty: number;
  source: string;
}

function cellDateString(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const str = String(value ?? '');
  return DATE_RE.test(str) ? str : null;
}

async function chunkedUpsert(rows: PendingUpsert[], batchSize = 10) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await Promise.all(
      batch.map((r) =>
        prisma.predictedSale.upsert({
          where: { outletId_itemName_stockDate: { outletId: r.outletId, itemName: r.itemName, stockDate: new Date(r.stockDate) } },
          create: { outletId: r.outletId, itemName: r.itemName, stockDate: new Date(r.stockDate), predictedQty: r.predictedQty, source: r.source },
          update: { predictedQty: r.predictedQty, source: r.source },
        })
      )
    );
  }
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npx tsx scripts/import-predicted-sales.ts <path-to-xlsx>');
    process.exit(1);
  }
  const source = path.basename(filePath);

  const workbook = new Workbook();
  await workbook.xlsx.readFile(filePath);

  const outlets = await prisma.outlet.findMany({ where: { rid: { in: Object.values(SHEET_TO_RID) } } });
  const ridToOutletId = new Map(outlets.map((o) => [o.rid, o.id]));

  const pending: PendingUpsert[] = [];

  for (const [sheetName, rid] of Object.entries(SHEET_TO_RID)) {
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
      console.warn(`Sheet not found, skipping: ${sheetName}`);
      continue;
    }
    const outletId = ridToOutletId.get(rid);
    if (!outletId) {
      console.warn(`No outlet with rid ${rid}, skipping sheet: ${sheetName}`);
      continue;
    }

    const headerRow = worksheet.getRow(HEADER_ROW);
    const columns: { index: number; itemName: string }[] = [];
    headerRow.eachCell((cell, colNumber) => {
      const label = String(cell.value ?? '').trim();
      if (label && !SKIP_COLUMNS.has(label)) {
        columns.push({ index: colNumber, itemName: label });
      }
    });

    let sheetRows = 0;
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= HEADER_ROW) return;
      const dateStr = cellDateString(row.getCell(1).value);
      if (!dateStr) return; // skips the TOTAL row and any blank rows

      for (const col of columns) {
        const raw = row.getCell(col.index).value;
        const qty = typeof raw === 'number' ? raw : Number(raw ?? 0);
        pending.push({ outletId, itemName: col.itemName, stockDate: dateStr, predictedQty: qty, source });
        sheetRows++;
      }
    });
    console.log(`${sheetName}: ${sheetRows} rows (${columns.length} items)`);
  }

  console.log(`Upserting ${pending.length} predicted-sale rows...`);
  await chunkedUpsert(pending);
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
