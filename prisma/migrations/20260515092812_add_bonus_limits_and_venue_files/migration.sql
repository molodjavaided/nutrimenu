-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bonusAiImports" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bonusItems" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bonusTtkExports" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "VenueFile" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploaderRole" "UserRole" NOT NULL,
    "category" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VenueFile_venueId_createdAt_idx" ON "VenueFile"("venueId", "createdAt");

-- AddForeignKey
ALTER TABLE "VenueFile" ADD CONSTRAINT "VenueFile_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
