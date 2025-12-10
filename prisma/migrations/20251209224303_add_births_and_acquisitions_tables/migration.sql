-- CreateTable
CREATE TABLE "births" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "breed" TEXT,
    "gender" TEXT,
    "motherId" TEXT,
    "fatherId" TEXT,
    "purity" TEXT,
    "observation" TEXT,
    "companyId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "births_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acquisitions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "acquisitionDate" TIMESTAMP(3) NOT NULL,
    "pricingMode" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "transportationFee" DECIMAL(10,2),
    "handlingFee" DECIMAL(10,2),
    "fees" JSONB,
    "linkedCashFlowId" TEXT,
    "linkedAccountsPayableId" TEXT,
    "observation" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acquisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acquisition_items" (
    "id" TEXT NOT NULL,
    "acquisitionId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "weight" DECIMAL(10,2) NOT NULL,
    "costPerArroba" DECIMAL(10,2) NOT NULL,
    "breed" TEXT,
    "gender" TEXT,
    "birthDate" TIMESTAMP(3),
    "motherId" TEXT,
    "fatherId" TEXT,
    "motherRegistrationNumber" TEXT,
    "fatherRegistrationNumber" TEXT,
    "purity" TEXT,
    "birthObservation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acquisition_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "births_animalId_key" ON "births"("animalId");

-- CreateIndex
CREATE INDEX "births_companyId_idx" ON "births"("companyId");

-- CreateIndex
CREATE INDEX "births_animalId_idx" ON "births"("animalId");

-- CreateIndex
CREATE INDEX "births_motherId_idx" ON "births"("motherId");

-- CreateIndex
CREATE INDEX "births_fatherId_idx" ON "births"("fatherId");

-- CreateIndex
CREATE INDEX "births_deletedAt_idx" ON "births"("deletedAt");

-- CreateIndex
CREATE INDEX "acquisitions_companyId_idx" ON "acquisitions"("companyId");

-- CreateIndex
CREATE INDEX "acquisitions_propertyId_idx" ON "acquisitions"("propertyId");

-- CreateIndex
CREATE INDEX "acquisitions_supplierId_idx" ON "acquisitions"("supplierId");

-- CreateIndex
CREATE INDEX "acquisitions_deletedAt_idx" ON "acquisitions"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "acquisition_items_animalId_key" ON "acquisition_items"("animalId");

-- CreateIndex
CREATE INDEX "acquisition_items_acquisitionId_idx" ON "acquisition_items"("acquisitionId");

-- CreateIndex
CREATE INDEX "acquisition_items_animalId_idx" ON "acquisition_items"("animalId");

-- AddForeignKey
ALTER TABLE "births" ADD CONSTRAINT "births_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "births" ADD CONSTRAINT "births_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "births" ADD CONSTRAINT "births_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "births" ADD CONSTRAINT "births_fatherId_fkey" FOREIGN KEY ("fatherId") REFERENCES "animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acquisitions" ADD CONSTRAINT "acquisitions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acquisitions" ADD CONSTRAINT "acquisitions_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acquisitions" ADD CONSTRAINT "acquisitions_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acquisition_items" ADD CONSTRAINT "acquisition_items_acquisitionId_fkey" FOREIGN KEY ("acquisitionId") REFERENCES "acquisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acquisition_items" ADD CONSTRAINT "acquisition_items_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
