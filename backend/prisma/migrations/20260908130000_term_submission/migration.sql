-- CreateTable
-- Termos enviados para assinatura eletronica (Clicksign).
CREATE TABLE "TermSubmission" (
    "id" TEXT NOT NULL,
    "unitId" TEXT,
    "personName" TEXT NOT NULL,
    "personEmail" TEXT,
    "personCpf" TEXT,
    "documentKey" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signedAt" TIMESTAMP(3),
    "refusedAt" TIMESTAMP(3),
    "clicksignUrl" TEXT,
    "driveUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TermSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TermSubmission_documentKey_key" ON "TermSubmission"("documentKey");

-- CreateIndex
CREATE INDEX "TermSubmission_unitId_idx" ON "TermSubmission"("unitId");

-- CreateIndex
CREATE INDEX "TermSubmission_personName_idx" ON "TermSubmission"("personName");

-- AddForeignKey
ALTER TABLE "TermSubmission" ADD CONSTRAINT "TermSubmission_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
