-- CreateEnum
CREATE TYPE "WebhookOutcome" AS ENUM ('SUCCESS', 'REJECTED');

-- CreateTable
CREATE TABLE "PurchaseOrderWebhookLog" (
    "id" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outletId" TEXT,
    "petpoojaPurchaseId" TEXT,
    "poNumber" TEXT,
    "menuSharingCode" TEXT,
    "outcome" "WebhookOutcome" NOT NULL,
    "httpStatusCode" INTEGER NOT NULL,
    "failureReason" TEXT,
    "status" "PurchaseOrderStatus",
    "writeResult" TEXT,
    "purchaseOrderId" TEXT,
    "rawPayload" JSONB NOT NULL,

    CONSTRAINT "PurchaseOrderWebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseOrderWebhookLog_outletId_receivedAt_idx" ON "PurchaseOrderWebhookLog"("outletId", "receivedAt");

-- CreateIndex
CREATE INDEX "PurchaseOrderWebhookLog_outcome_receivedAt_idx" ON "PurchaseOrderWebhookLog"("outcome", "receivedAt");

-- CreateIndex
CREATE INDEX "PurchaseOrderWebhookLog_petpoojaPurchaseId_idx" ON "PurchaseOrderWebhookLog"("petpoojaPurchaseId");

-- AddForeignKey
ALTER TABLE "PurchaseOrderWebhookLog" ADD CONSTRAINT "PurchaseOrderWebhookLog_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
