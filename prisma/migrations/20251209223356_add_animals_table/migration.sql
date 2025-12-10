-- CreateTable
CREATE TABLE "animals" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "acquisitionDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "companyId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "animals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "animals_companyId_idx" ON "animals"("companyId");

-- CreateIndex
CREATE INDEX "animals_propertyId_idx" ON "animals"("propertyId");

-- CreateIndex
CREATE INDEX "animals_deletedAt_idx" ON "animals"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "animals_companyId_code_key" ON "animals"("companyId", "code");

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
