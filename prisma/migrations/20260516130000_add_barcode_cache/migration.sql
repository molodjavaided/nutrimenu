-- CreateTable
CREATE TABLE "BarcodeCache" (
    "barcode"    TEXT NOT NULL,
    "name"       TEXT,
    "brand"      TEXT,
    "calories"   DOUBLE PRECISION,
    "protein"    DOUBLE PRECISION,
    "fat"        DOUBLE PRECISION,
    "carbs"      DOUBLE PRECISION,
    "confidence" TEXT NOT NULL DEFAULT 'medium',
    "source"     TEXT NOT NULL DEFAULT 'gemini',
    "found"      BOOLEAN NOT NULL DEFAULT true,
    "fetchedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BarcodeCache_pkey" PRIMARY KEY ("barcode")
);

-- CreateIndex
CREATE INDEX "BarcodeCache_fetchedAt_idx" ON "BarcodeCache"("fetchedAt");
