-- AlterTable
ALTER TABLE "IngredientRef" ADD COLUMN     "coldLossPercent" DOUBLE PRECISION,
ADD COLUMN     "pricePerKg" DOUBLE PRECISION,
ADD COLUMN     "yieldCoefficients" JSONB;

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "creationMode" TEXT,
ADD COLUMN     "finalWeight" DOUBLE PRECISION,
ADD COLUMN     "servingSize" DOUBLE PRECISION;
