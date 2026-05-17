-- AlterTable
ALTER TABLE "BarcodeCache" ADD COLUMN     "category" TEXT,
ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "packageSize" TEXT;

-- AlterTable
ALTER TABLE "IngredientRef" ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "packageSize" TEXT;
