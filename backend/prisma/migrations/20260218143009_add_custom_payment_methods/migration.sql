-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "customMethodLabel" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "customMethodLabel" TEXT;

-- CreateTable
CREATE TABLE "CustomPaymentMethod" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomPaymentMethod_hotelId_name_key" ON "CustomPaymentMethod"("hotelId", "name");

-- AddForeignKey
ALTER TABLE "CustomPaymentMethod" ADD CONSTRAINT "CustomPaymentMethod_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
