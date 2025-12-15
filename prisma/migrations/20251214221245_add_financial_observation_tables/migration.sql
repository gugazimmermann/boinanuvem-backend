-- CreateTable
CREATE TABLE "cash_flow_observations" (
    "id" TEXT NOT NULL,
    "cashFlowId" TEXT NOT NULL,
    "observation" TEXT NOT NULL,
    "fileIds" JSONB,
    "companyId" TEXT NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_flow_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts_payable_observations" (
    "id" TEXT NOT NULL,
    "accountsPayableId" TEXT NOT NULL,
    "observation" TEXT NOT NULL,
    "fileIds" JSONB,
    "companyId" TEXT NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_payable_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts_receivable_observations" (
    "id" TEXT NOT NULL,
    "accountsReceivableId" TEXT NOT NULL,
    "observation" TEXT NOT NULL,
    "fileIds" JSONB,
    "companyId" TEXT NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_receivable_observations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_flow_observations_companyId_idx" ON "cash_flow_observations"("companyId");

-- CreateIndex
CREATE INDEX "cash_flow_observations_cashFlowId_idx" ON "cash_flow_observations"("cashFlowId");

-- CreateIndex
CREATE INDEX "cash_flow_observations_deletedAt_idx" ON "cash_flow_observations"("deletedAt");

-- CreateIndex
CREATE INDEX "accounts_payable_observations_companyId_idx" ON "accounts_payable_observations"("companyId");

-- CreateIndex
CREATE INDEX "accounts_payable_observations_accountsPayableId_idx" ON "accounts_payable_observations"("accountsPayableId");

-- CreateIndex
CREATE INDEX "accounts_payable_observations_deletedAt_idx" ON "accounts_payable_observations"("deletedAt");

-- CreateIndex
CREATE INDEX "accounts_receivable_observations_companyId_idx" ON "accounts_receivable_observations"("companyId");

-- CreateIndex
CREATE INDEX "accounts_receivable_observations_accountsReceivableId_idx" ON "accounts_receivable_observations"("accountsReceivableId");

-- CreateIndex
CREATE INDEX "accounts_receivable_observations_deletedAt_idx" ON "accounts_receivable_observations"("deletedAt");

-- AddForeignKey
ALTER TABLE "cash_flow_observations" ADD CONSTRAINT "cash_flow_observations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flow_observations" ADD CONSTRAINT "cash_flow_observations_cashFlowId_fkey" FOREIGN KEY ("cashFlowId") REFERENCES "cash_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_payable_observations" ADD CONSTRAINT "accounts_payable_observations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_payable_observations" ADD CONSTRAINT "accounts_payable_observations_accountsPayableId_fkey" FOREIGN KEY ("accountsPayableId") REFERENCES "accounts_payable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_receivable_observations" ADD CONSTRAINT "accounts_receivable_observations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_receivable_observations" ADD CONSTRAINT "accounts_receivable_observations_accountsReceivableId_fkey" FOREIGN KEY ("accountsReceivableId") REFERENCES "accounts_receivable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
