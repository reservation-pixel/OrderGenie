-- CreateTable
CREATE TABLE "PredictedSale" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "stockDate" DATE NOT NULL,
    "predictedQty" DECIMAL(10,2) NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredictedSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PredictedSale_outletId_itemName_stockDate_key" ON "PredictedSale"("outletId", "itemName", "stockDate");

-- CreateIndex
CREATE INDEX "PredictedSale_outletId_stockDate_idx" ON "PredictedSale"("outletId", "stockDate");

-- AddForeignKey
ALTER TABLE "PredictedSale" ADD CONSTRAINT "PredictedSale_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
