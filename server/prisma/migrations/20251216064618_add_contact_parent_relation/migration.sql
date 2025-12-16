-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Contact" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "company" TEXT,
    "jobTitle" TEXT,
    "categoryId" INTEGER,
    "parentId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contact_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ContactCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contact_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Contact" ("address", "categoryId", "company", "createdAt", "email", "id", "jobTitle", "name", "phone", "updatedAt") SELECT "address", "categoryId", "company", "createdAt", "email", "id", "jobTitle", "name", "phone", "updatedAt" FROM "Contact";
DROP TABLE "Contact";
ALTER TABLE "new_Contact" RENAME TO "Contact";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
