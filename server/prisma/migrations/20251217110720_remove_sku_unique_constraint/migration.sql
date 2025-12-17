-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "minLevel" INTEGER NOT NULL DEFAULT 5,
    "maxLevel" INTEGER NOT NULL DEFAULT 100,
    "supplierId" INTEGER,
    "recDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRecID" INTEGER,
    "modifiedByUserId" INTEGER NOT NULL,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Product_modifiedByUserId_fkey" FOREIGN KEY ("modifiedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("createdAt", "description", "id", "isLatest", "lastRecID", "maxLevel", "minLevel", "modifiedByUserId", "name", "price", "quantity", "recDate", "reserved", "sku", "supplierId", "updatedAt") SELECT "createdAt", "description", "id", "isLatest", "lastRecID", "maxLevel", "minLevel", "modifiedByUserId", "name", "price", "quantity", "recDate", "reserved", "sku", "supplierId", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_sku_idx" ON "Product"("sku");
CREATE INDEX "Product_name_idx" ON "Product"("name");
CREATE INDEX "Product_quantity_idx" ON "Product"("quantity");
CREATE INDEX "Product_supplierId_idx" ON "Product"("supplierId");
CREATE INDEX "Product_isLatest_idx" ON "Product"("isLatest");
CREATE INDEX "Product_lastRecID_idx" ON "Product"("lastRecID");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
