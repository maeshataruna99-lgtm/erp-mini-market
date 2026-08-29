-- AlterTable
CREATE UNIQUE INDEX "StockOpnameItem_sessionId_productId_key" ON "StockOpnameItem"("sessionId", "productId");
