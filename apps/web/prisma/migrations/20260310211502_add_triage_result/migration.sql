-- CreateTable
CREATE TABLE "triageResult" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "intent" "Intent",
    "confidence" DOUBLE PRECISION,
    "entities" JSONB,
    "method" TEXT NOT NULL DEFAULT 'rules',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "triageResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "triageResult_enquiryId_key" ON "triageResult"("enquiryId");

-- AddForeignKey
ALTER TABLE "triageResult" ADD CONSTRAINT "triageResult_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
