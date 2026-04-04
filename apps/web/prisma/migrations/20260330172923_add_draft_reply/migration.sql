-- CreateTable
CREATE TABLE "DraftReply" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DraftReply_enquiryId_key" ON "DraftReply"("enquiryId");

-- AddForeignKey
ALTER TABLE "DraftReply" ADD CONSTRAINT "DraftReply_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
