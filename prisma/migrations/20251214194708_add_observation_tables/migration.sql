-- CreateTable
CREATE TABLE "animal_observations" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "observation" TEXT NOT NULL,
    "fileIds" JSONB,
    "companyId" TEXT NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "animal_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyer_observations" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "observation" TEXT NOT NULL,
    "fileIds" JSONB,
    "companyId" TEXT NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buyer_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_observations" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "observation" TEXT NOT NULL,
    "fileIds" JSONB,
    "companyId" TEXT NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_observations" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "observation" TEXT NOT NULL,
    "fileIds" JSONB,
    "companyId" TEXT NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_observations" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "observation" TEXT NOT NULL,
    "fileIds" JSONB,
    "companyId" TEXT NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_provider_observations" (
    "id" TEXT NOT NULL,
    "serviceProviderId" TEXT NOT NULL,
    "observation" TEXT NOT NULL,
    "fileIds" JSONB,
    "companyId" TEXT NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_provider_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_observations" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "observation" TEXT NOT NULL,
    "fileIds" JSONB,
    "companyId" TEXT NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_observations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "animal_observations_companyId_idx" ON "animal_observations"("companyId");

-- CreateIndex
CREATE INDEX "animal_observations_animalId_idx" ON "animal_observations"("animalId");

-- CreateIndex
CREATE INDEX "animal_observations_deletedAt_idx" ON "animal_observations"("deletedAt");

-- CreateIndex
CREATE INDEX "buyer_observations_companyId_idx" ON "buyer_observations"("companyId");

-- CreateIndex
CREATE INDEX "buyer_observations_buyerId_idx" ON "buyer_observations"("buyerId");

-- CreateIndex
CREATE INDEX "buyer_observations_deletedAt_idx" ON "buyer_observations"("deletedAt");

-- CreateIndex
CREATE INDEX "employee_observations_companyId_idx" ON "employee_observations"("companyId");

-- CreateIndex
CREATE INDEX "employee_observations_employeeId_idx" ON "employee_observations"("employeeId");

-- CreateIndex
CREATE INDEX "employee_observations_deletedAt_idx" ON "employee_observations"("deletedAt");

-- CreateIndex
CREATE INDEX "inventory_observations_companyId_idx" ON "inventory_observations"("companyId");

-- CreateIndex
CREATE INDEX "inventory_observations_itemId_idx" ON "inventory_observations"("itemId");

-- CreateIndex
CREATE INDEX "inventory_observations_deletedAt_idx" ON "inventory_observations"("deletedAt");

-- CreateIndex
CREATE INDEX "location_observations_companyId_idx" ON "location_observations"("companyId");

-- CreateIndex
CREATE INDEX "location_observations_locationId_idx" ON "location_observations"("locationId");

-- CreateIndex
CREATE INDEX "location_observations_deletedAt_idx" ON "location_observations"("deletedAt");

-- CreateIndex
CREATE INDEX "service_provider_observations_companyId_idx" ON "service_provider_observations"("companyId");

-- CreateIndex
CREATE INDEX "service_provider_observations_serviceProviderId_idx" ON "service_provider_observations"("serviceProviderId");

-- CreateIndex
CREATE INDEX "service_provider_observations_deletedAt_idx" ON "service_provider_observations"("deletedAt");

-- CreateIndex
CREATE INDEX "supplier_observations_companyId_idx" ON "supplier_observations"("companyId");

-- CreateIndex
CREATE INDEX "supplier_observations_supplierId_idx" ON "supplier_observations"("supplierId");

-- CreateIndex
CREATE INDEX "supplier_observations_deletedAt_idx" ON "supplier_observations"("deletedAt");

-- AddForeignKey
ALTER TABLE "animal_observations" ADD CONSTRAINT "animal_observations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animal_observations" ADD CONSTRAINT "animal_observations_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_observations" ADD CONSTRAINT "buyer_observations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_observations" ADD CONSTRAINT "buyer_observations_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_observations" ADD CONSTRAINT "employee_observations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_observations" ADD CONSTRAINT "employee_observations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_observations" ADD CONSTRAINT "inventory_observations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_observations" ADD CONSTRAINT "inventory_observations_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_observations" ADD CONSTRAINT "location_observations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_observations" ADD CONSTRAINT "location_observations_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_provider_observations" ADD CONSTRAINT "service_provider_observations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_provider_observations" ADD CONSTRAINT "service_provider_observations_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "service_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_observations" ADD CONSTRAINT "supplier_observations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_observations" ADD CONSTRAINT "supplier_observations_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
