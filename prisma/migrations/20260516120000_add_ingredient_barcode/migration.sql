-- AlterTable
ALTER TABLE "IngredientRef" ADD COLUMN "barcode" TEXT;

-- CreateIndex
CREATE INDEX "IngredientRef_barcode_idx" ON "IngredientRef"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "IngredientRef_venueId_barcode_key" ON "IngredientRef"("venueId", "barcode");
