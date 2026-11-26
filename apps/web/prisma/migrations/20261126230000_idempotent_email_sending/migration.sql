-- CreateEnum
CREATE TYPE "OutboundEmailStatus" AS ENUM ('SENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "OutboundEmail" ADD COLUMN     "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "status" "OutboundEmailStatus" NOT NULL DEFAULT 'SENT';

-- CreateIndex
CREATE UNIQUE INDEX "OutboundEmail_idempotencyKey_key" ON "OutboundEmail"("idempotencyKey");

