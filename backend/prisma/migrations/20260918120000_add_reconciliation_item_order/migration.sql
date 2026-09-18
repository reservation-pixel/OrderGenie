-- User-arranged row order for the Reconciliation page, one order per brand.
CREATE TABLE "ReconciliationItemOrder" (
    "id"        TEXT NOT NULL,
    "brand"     TEXT NOT NULL,
    "itemName"  TEXT NOT NULL,
    "position"  INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReconciliationItemOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReconciliationItemOrder_brand_itemName_key" ON "ReconciliationItemOrder"("brand", "itemName");
CREATE INDEX "ReconciliationItemOrder_brand_position_idx" ON "ReconciliationItemOrder"("brand", "position");
