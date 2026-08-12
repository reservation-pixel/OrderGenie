-- CreateTable
CREATE TABLE "SoldOutEntry" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "stockDate" DATE NOT NULL,
    "missedQty" INTEGER NOT NULL,
    "reportedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SoldOutEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SoldOutEntry_outletId_itemName_stockDate_key" ON "SoldOutEntry"("outletId", "itemName", "stockDate");

-- CreateIndex
CREATE INDEX "SoldOutEntry_outletId_stockDate_idx" ON "SoldOutEntry"("outletId", "stockDate");

-- AddForeignKey
ALTER TABLE "SoldOutEntry" ADD CONSTRAINT "SoldOutEntry_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoldOutEntry" ADD CONSTRAINT "SoldOutEntry_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
