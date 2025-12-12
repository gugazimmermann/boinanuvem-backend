-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "saleType" TEXT NOT NULL,
    "pricingMode" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "fees" JSONB,
    "transportationFee" DECIMAL(10,2),
    "additionalFees" DECIMAL(10,2),
    "linkedCashFlowId" TEXT,
    "linkedAccountsReceivableId" TEXT,
    "observation" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "weight" DECIMAL(10,2) NOT NULL,
    "carcassWeight" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deaths" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "deathDate" TIMESTAMP(3) NOT NULL,
    "cause" TEXT NOT NULL,
    "observation" TEXT,
    "companyId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deaths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weighings" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "weighingDate" TIMESTAMP(3) NOT NULL,
    "weight" DECIMAL(10,2) NOT NULL,
    "employeeIds" JSONB NOT NULL,
    "serviceProviderIds" JSONB NOT NULL,
    "appliedMedicines" JSONB,
    "observation" TEXT,
    "companyId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weighings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sales_companyId_idx" ON "sales"("companyId");

-- CreateIndex
CREATE INDEX "sales_propertyId_idx" ON "sales"("propertyId");

-- CreateIndex
CREATE INDEX "sales_buyerId_idx" ON "sales"("buyerId");

-- CreateIndex
CREATE INDEX "sales_deletedAt_idx" ON "sales"("deletedAt");

-- CreateIndex
CREATE INDEX "sale_items_saleId_idx" ON "sale_items"("saleId");

-- CreateIndex
CREATE INDEX "sale_items_animalId_idx" ON "sale_items"("animalId");

-- CreateIndex
CREATE UNIQUE INDEX "deaths_animalId_key" ON "deaths"("animalId");

-- CreateIndex
CREATE INDEX "deaths_companyId_idx" ON "deaths"("companyId");

-- CreateIndex
CREATE INDEX "deaths_animalId_idx" ON "deaths"("animalId");

-- CreateIndex
CREATE INDEX "deaths_deletedAt_idx" ON "deaths"("deletedAt");

-- CreateIndex
CREATE INDEX "weighings_companyId_idx" ON "weighings"("companyId");

-- CreateIndex
CREATE INDEX "weighings_animalId_idx" ON "weighings"("animalId");

-- CreateIndex
CREATE INDEX "weighings_deletedAt_idx" ON "weighings"("deletedAt");

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deaths" ADD CONSTRAINT "deaths_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deaths" ADD CONSTRAINT "deaths_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weighings" ADD CONSTRAINT "weighings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weighings" ADD CONSTRAINT "weighings_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
