-- CreateTable
CREATE TABLE "animal_movements" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "locationId" TEXT,
    "animalIds" JSONB NOT NULL,
    "employeeIds" JSONB,
    "serviceProviderIds" JSONB,
    "date" TIMESTAMP(3) NOT NULL,
    "observation" TEXT,
    "fileIds" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "animal_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_movements" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "locationIds" JSONB NOT NULL,
    "employeeIds" JSONB,
    "serviceProviderIds" JSONB,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "observation" TEXT,
    "fileIds" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "animal_movements_companyId_idx" ON "animal_movements"("companyId");

-- CreateIndex
CREATE INDEX "animal_movements_propertyId_idx" ON "animal_movements"("propertyId");

-- CreateIndex
CREATE INDEX "animal_movements_locationId_idx" ON "animal_movements"("locationId");

-- CreateIndex
CREATE INDEX "animal_movements_deletedAt_idx" ON "animal_movements"("deletedAt");

-- CreateIndex
CREATE INDEX "location_movements_companyId_idx" ON "location_movements"("companyId");

-- CreateIndex
CREATE INDEX "location_movements_propertyId_idx" ON "location_movements"("propertyId");

-- CreateIndex
CREATE INDEX "location_movements_deletedAt_idx" ON "location_movements"("deletedAt");

-- AddForeignKey
ALTER TABLE "animal_movements" ADD CONSTRAINT "animal_movements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animal_movements" ADD CONSTRAINT "animal_movements_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animal_movements" ADD CONSTRAINT "animal_movements_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_movements" ADD CONSTRAINT "location_movements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_movements" ADD CONSTRAINT "location_movements_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

