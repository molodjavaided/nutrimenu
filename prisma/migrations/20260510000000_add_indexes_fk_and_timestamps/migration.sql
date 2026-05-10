-- AlterTable: timestamps for Category
ALTER TABLE "Category"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: timestamps for MenuItem
ALTER TABLE "MenuItem"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex: speed up listing categories by venue and items by category
CREATE INDEX "Category_venueId_sortOrder_idx" ON "Category"("venueId", "sortOrder");
CREATE INDEX "MenuItem_categoryId_sortOrder_idx" ON "MenuItem"("categoryId", "sortOrder");
CREATE INDEX "MenuItem_venueId_idx" ON "MenuItem"("venueId");

-- Cleanup: remove any orphan MenuItem rows whose venueId no longer exists,
-- so the FK constraint below can be added safely.
DELETE FROM "MenuItem"
WHERE "venueId" NOT IN (SELECT "id" FROM "Venue");

-- AddForeignKey: enforce MenuItem.venueId integrity
ALTER TABLE "MenuItem"
  ADD CONSTRAINT "MenuItem_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "Venue"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
