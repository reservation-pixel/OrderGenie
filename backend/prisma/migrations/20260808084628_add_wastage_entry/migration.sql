-- CreateEnum
CREATE TYPE "WastageReason" AS ENUM ('EXPIRED', 'SPOILED', 'PREP_ERROR', 'DROPPED_DAMAGED', 'OTHER');

-- CreateTable
CREATE TABLE "WastageEntry" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT,
    "reason" "WastageReason" NOT NULL,
    "notes" TEXT,
    "reportedById" TEXT,
    "wastageDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WastageEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WastageEntry_outletId_wastageDate_idx" ON "WastageEntry"("outletId", "wastageDate");

-- AddForeignKey
ALTER TABLE "WastageEntry" ADD CONSTRAINT "WastageEntry_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WastageEntry" ADD CONSTRAINT "WastageEntry_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
