-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "trialEndDate" TIMESTAMP(3),
ADD COLUMN     "trialStartDate" TIMESTAMP(3),
ADD COLUMN     "trialStatus" TEXT DEFAULT 'active';
