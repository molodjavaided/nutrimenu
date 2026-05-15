-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('START', 'STANDARD', 'CUSTOM');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'START',
ADD COLUMN     "trialEndsAt" TIMESTAMP(3),
ADD COLUMN     "ttkImportMonth" INTEGER;
