-- CreateTable
CREATE TABLE "MenuView" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "MenuView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MenuView_venueId_idx" ON "MenuView"("venueId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuView_venueId_date_key" ON "MenuView"("venueId", "date");
