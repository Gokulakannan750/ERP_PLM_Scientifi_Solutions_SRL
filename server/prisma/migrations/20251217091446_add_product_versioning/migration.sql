-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Create new table with nullable modifiedByUserId first
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
    "modifiedByUserId" INTEGER NOT NULL DEFAULT 1,
    "isLatest" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Product_modifiedByUserId_fkey" FOREIGN KEY ("modifiedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Copy old data (modifiedByUserId will use default value 1)
INSERT INTO "new_Product" ("createdAt", "description", "id", "maxLevel", "minLevel", "name", "price", "quantity", "reserved", "sku", "supplierId", "updatedAt") 
SELECT "createdAt", "description", "id", "maxLevel", "minLevel", "name", "price", "quantity", "reserved", "sku", "supplierId", "updatedAt" FROM "Product";

-- Drop old table and rename
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";

-- Create indexes
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE INDEX "Product_sku_idx" ON "Product"("sku");
CREATE INDEX "Product_name_idx" ON "Product"("name");
CREATE INDEX "Product_quantity_idx" ON "Product"("quantity");
CREATE INDEX "Product_supplierId_idx" ON "Product"("supplierId");
CREATE INDEX "Product_isLatest_idx" ON "Product"("isLatest");
CREATE INDEX "Product_lastRecID_idx" ON "Product"("lastRecID");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
