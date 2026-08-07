-- CreateEnum
CREATE TYPE "ClassAItemType" AS ENUM ('ITEM', 'CATEGORY');

-- CreateTable
CREATE TABLE "ClassAItem" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "type" "ClassAItemType" NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassAItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassAItem_brand_type_value_key" ON "ClassAItem"("brand", "type", "value");
