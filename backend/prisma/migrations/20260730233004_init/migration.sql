-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'COMMON',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "unitId" TEXT,
    "lastUnitId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "unitId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Category_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT,
    "assetId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "color" TEXT,
    "configuration" TEXT,
    "serialNumber" TEXT,
    "assetTag" TEXT,
    "status" TEXT NOT NULL DEFAULT 'EM_ESTOQUE',
    "condition" TEXT NOT NULL DEFAULT 'BOM',
    "supplier" TEXT,
    "location" TEXT,
    "ownership" TEXT,
    "pelicula" TEXT,
    "capa" TEXT,
    "imei1" TEXT,
    "imei2" TEXT,
    "macAddress" TEXT,
    "currentUserName" TEXT,
    "department" TEXT,
    "manager" TEXT,
    "userEmail" TEXT,
    "userCpf" TEXT,
    "acquisitionDate" DATETIME,
    "deliveryDate" DATETIME,
    "warrantyEndDate" DATETIME,
    "lastCheckDate" DATETIME,
    "value" REAL,
    "notes" TEXT,
    "accessories" TEXT,
    "statusChangedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Equipment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Equipment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssignmentHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT,
    "department" TEXT,
    "manager" TEXT,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssignmentHistory_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cnpj" TEXT,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Settings" (
    "unitId" TEXT NOT NULL PRIMARY KEY,
    "idleDaysLimit" INTEGER NOT NULL DEFAULT 90,
    "conferenceDaysLimit" INTEGER NOT NULL DEFAULT 180,
    "warrantyWarningDays" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Settings_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "name" TEXT NOT NULL DEFAULT 'Termo de Responsabilidade',
    "content" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_unitId_idx" ON "User"("unitId");

-- CreateIndex
CREATE INDEX "Category_unitId_idx" ON "Category"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_unitId_key" ON "Category"("name", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_assetId_key" ON "Equipment"("assetId");

-- CreateIndex
CREATE INDEX "Equipment_categoryId_idx" ON "Equipment"("categoryId");

-- CreateIndex
CREATE INDEX "Equipment_status_idx" ON "Equipment"("status");

-- CreateIndex
CREATE INDEX "Equipment_unitId_idx" ON "Equipment"("unitId");

-- CreateIndex
CREATE INDEX "AssignmentHistory_equipmentId_idx" ON "AssignmentHistory"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_name_key" ON "Unit"("name");
