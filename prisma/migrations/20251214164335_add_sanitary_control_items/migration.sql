-- CreateTable
CREATE TABLE "sanitary_control_items" (
    "id" TEXT NOT NULL,
    "sanitaryControlId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "calculatedDosage" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sanitary_control_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sanitary_control_items_sanitaryControlId_idx" ON "sanitary_control_items"("sanitaryControlId");

-- CreateIndex
CREATE INDEX "sanitary_control_items_itemId_idx" ON "sanitary_control_items"("itemId");

-- AddForeignKey
ALTER TABLE "sanitary_control_items" ADD CONSTRAINT "sanitary_control_items_sanitaryControlId_fkey" FOREIGN KEY ("sanitaryControlId") REFERENCES "sanitary_controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanitary_control_items" ADD CONSTRAINT "sanitary_control_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
