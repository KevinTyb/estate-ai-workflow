-- AlterTable
ALTER TABLE "triageResult" ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewReason" TEXT;
