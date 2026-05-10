-- CreateEnum
CREATE TYPE "FeedbackSource" AS ENUM ('OWNER', 'GUEST');
CREATE TYPE "FeedbackCategory" AS ENUM ('bug', 'idea', 'question', 'other');
CREATE TYPE "FeedbackStatus" AS ENUM ('new', 'triaged', 'resolved', 'wontfix');

-- CreateTable
CREATE TABLE "Feedback" (
  "id"        TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source"    "FeedbackSource" NOT NULL,
  "category"  "FeedbackCategory" NOT NULL DEFAULT 'other',
  "message"   TEXT NOT NULL,
  "rating"    INTEGER,
  "email"     TEXT,
  "pageUrl"   TEXT,
  "userAgent" TEXT,
  "venueId"   TEXT,
  "userId"    TEXT,
  "status"    "FeedbackStatus" NOT NULL DEFAULT 'new',
  "note"      TEXT,
  CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feedback_status_createdAt_idx" ON "Feedback"("status", "createdAt");
CREATE INDEX "Feedback_source_createdAt_idx" ON "Feedback"("source", "createdAt");
CREATE INDEX "Feedback_venueId_idx" ON "Feedback"("venueId");
