-- Monthly quota for cheap AI lookups (barcode + ingredient meta). Additive, safe.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aiLookupCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aiLookupMonth" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bonusAiLookups" INTEGER NOT NULL DEFAULT 0;
