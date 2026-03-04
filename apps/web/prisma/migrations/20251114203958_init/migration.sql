-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('PENDING', 'DRAFTED', 'SENT', 'SCHEDULED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Intent" AS ENUM ('VIEWING', 'VALUATION', 'MAINTENANCE', 'GENERAL', 'SPAM');

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'PENDING',
    "intent" "Intent",
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "propertyRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);
