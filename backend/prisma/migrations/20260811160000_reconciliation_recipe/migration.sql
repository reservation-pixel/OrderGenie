-- CreateEnum
CREATE TYPE "RecipeTriggerType" AS ENUM ('ITEM_NAMES', 'NAME_CONTAINS');

-- CreateTable
CREATE TABLE "ReconciliationRecipe" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "ingredientName" TEXT NOT NULL,
    "triggerType" "RecipeTriggerType" NOT NULL,
    "triggerValues" TEXT[],
    "qtyPerMatch" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconciliationRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReconciliationRecipe_brand_ingredientName_idx" ON "ReconciliationRecipe"("brand", "ingredientName");
