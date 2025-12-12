-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "customCategory" TEXT,
    "unit" TEXT NOT NULL,
    "minimumStock" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2),
    "supplierId" TEXT,
    "hasExpiration" BOOLEAN NOT NULL DEFAULT false,
    "expirationDate" TIMESTAMP(3),
    "usageAmount" DECIMAL(10,2),
    "usageUnit" TEXT,
    "usageBasis" TEXT,
    "companyId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_item_properties" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_item_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2),
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "supplierId" TEXT,
    "cashFlowId" TEXT,
    "propertyId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT,
    "expirationDate" TIMESTAMP(3),
    "employeeIds" JSONB,
    "serviceProviderIds" JSONB,
    "observation" TEXT,
    "fileIds" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "breedings" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "method" TEXT NOT NULL,
    "bullId" TEXT,
    "attemptNumber" INTEGER,
    "semenCode" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "observation" TEXT,
    "companyId" TEXT NOT NULL,
    "employeeIds" JSONB,
    "serviceProviderIds" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "breedings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sanitary_controls" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "itemId" TEXT,
    "quantity" DECIMAL(10,2),
    "calculatedDosage" DECIMAL(10,2),
    "observation" TEXT,
    "companyId" TEXT NOT NULL,
    "employeeIds" JSONB,
    "serviceProviderIds" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sanitary_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_flows" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "paymentMethod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "bankAccountId" TEXT,
    "propertyId" TEXT,
    "employeeId" TEXT,
    "serviceProviderId" TEXT,
    "supplierId" TEXT,
    "buyerId" TEXT,
    "paymentDate" TIMESTAMP(3),
    "referenceNumber" TEXT,
    "linkedSaleId" TEXT,
    "linkedAcquisitionId" TEXT,
    "observation" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts_payable" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "supplierId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "paymentMethod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "bankAccountId" TEXT,
    "propertyId" TEXT,
    "employeeId" TEXT,
    "serviceProviderId" TEXT,
    "paidDate" TIMESTAMP(3),
    "paidAmount" DECIMAL(10,2),
    "referenceNumber" TEXT,
    "linkedAcquisitionId" TEXT,
    "observation" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_payable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts_receivable" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "buyerId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "paymentMethod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "bankAccountId" TEXT,
    "propertyId" TEXT,
    "paidDate" TIMESTAMP(3),
    "paidAmount" DECIMAL(10,2),
    "referenceNumber" TEXT,
    "linkedSaleId" TEXT,
    "observation" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_receivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "accountHolderName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_items_companyId_idx" ON "inventory_items"("companyId");

-- CreateIndex
CREATE INDEX "inventory_items_supplierId_idx" ON "inventory_items"("supplierId");

-- CreateIndex
CREATE INDEX "inventory_items_deletedAt_idx" ON "inventory_items"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_companyId_code_key" ON "inventory_items"("companyId", "code");

-- CreateIndex
CREATE INDEX "inventory_item_properties_inventoryItemId_idx" ON "inventory_item_properties"("inventoryItemId");

-- CreateIndex
CREATE INDEX "inventory_item_properties_propertyId_idx" ON "inventory_item_properties"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_item_properties_inventoryItemId_propertyId_key" ON "inventory_item_properties"("inventoryItemId", "propertyId");

-- CreateIndex
CREATE INDEX "inventory_movements_companyId_idx" ON "inventory_movements"("companyId");

-- CreateIndex
CREATE INDEX "inventory_movements_itemId_idx" ON "inventory_movements"("itemId");

-- CreateIndex
CREATE INDEX "inventory_movements_propertyId_idx" ON "inventory_movements"("propertyId");

-- CreateIndex
CREATE INDEX "inventory_movements_deletedAt_idx" ON "inventory_movements"("deletedAt");

-- CreateIndex
CREATE INDEX "breedings_companyId_idx" ON "breedings"("companyId");

-- CreateIndex
CREATE INDEX "breedings_animalId_idx" ON "breedings"("animalId");

-- CreateIndex
CREATE INDEX "breedings_bullId_idx" ON "breedings"("bullId");

-- CreateIndex
CREATE INDEX "breedings_deletedAt_idx" ON "breedings"("deletedAt");

-- CreateIndex
CREATE INDEX "sanitary_controls_companyId_idx" ON "sanitary_controls"("companyId");

-- CreateIndex
CREATE INDEX "sanitary_controls_animalId_idx" ON "sanitary_controls"("animalId");

-- CreateIndex
CREATE INDEX "sanitary_controls_itemId_idx" ON "sanitary_controls"("itemId");

-- CreateIndex
CREATE INDEX "sanitary_controls_deletedAt_idx" ON "sanitary_controls"("deletedAt");

-- CreateIndex
CREATE INDEX "cash_flows_companyId_idx" ON "cash_flows"("companyId");

-- CreateIndex
CREATE INDEX "cash_flows_propertyId_idx" ON "cash_flows"("propertyId");

-- CreateIndex
CREATE INDEX "cash_flows_deletedAt_idx" ON "cash_flows"("deletedAt");

-- CreateIndex
CREATE INDEX "accounts_payable_companyId_idx" ON "accounts_payable"("companyId");

-- CreateIndex
CREATE INDEX "accounts_payable_supplierId_idx" ON "accounts_payable"("supplierId");

-- CreateIndex
CREATE INDEX "accounts_payable_propertyId_idx" ON "accounts_payable"("propertyId");

-- CreateIndex
CREATE INDEX "accounts_payable_deletedAt_idx" ON "accounts_payable"("deletedAt");

-- CreateIndex
CREATE INDEX "accounts_receivable_companyId_idx" ON "accounts_receivable"("companyId");

-- CreateIndex
CREATE INDEX "accounts_receivable_buyerId_idx" ON "accounts_receivable"("buyerId");

-- CreateIndex
CREATE INDEX "accounts_receivable_propertyId_idx" ON "accounts_receivable"("propertyId");

-- CreateIndex
CREATE INDEX "accounts_receivable_deletedAt_idx" ON "accounts_receivable"("deletedAt");

-- CreateIndex
CREATE INDEX "bank_accounts_companyId_idx" ON "bank_accounts"("companyId");

-- CreateIndex
CREATE INDEX "bank_accounts_deletedAt_idx" ON "bank_accounts"("deletedAt");

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_item_properties" ADD CONSTRAINT "inventory_item_properties_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_item_properties" ADD CONSTRAINT "inventory_item_properties_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breedings" ADD CONSTRAINT "breedings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breedings" ADD CONSTRAINT "breedings_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breedings" ADD CONSTRAINT "breedings_bullId_fkey" FOREIGN KEY ("bullId") REFERENCES "animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanitary_controls" ADD CONSTRAINT "sanitary_controls_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanitary_controls" ADD CONSTRAINT "sanitary_controls_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanitary_controls" ADD CONSTRAINT "sanitary_controls_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flows" ADD CONSTRAINT "cash_flows_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flows" ADD CONSTRAINT "cash_flows_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flows" ADD CONSTRAINT "cash_flows_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flows" ADD CONSTRAINT "cash_flows_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "service_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flows" ADD CONSTRAINT "cash_flows_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flows" ADD CONSTRAINT "cash_flows_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flows" ADD CONSTRAINT "cash_flows_linkedSaleId_fkey" FOREIGN KEY ("linkedSaleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flows" ADD CONSTRAINT "cash_flows_linkedAcquisitionId_fkey" FOREIGN KEY ("linkedAcquisitionId") REFERENCES "acquisitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "service_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_linkedAcquisitionId_fkey" FOREIGN KEY ("linkedAcquisitionId") REFERENCES "acquisitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_linkedSaleId_fkey" FOREIGN KEY ("linkedSaleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
