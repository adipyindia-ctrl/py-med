-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_consultations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "voiceTranscript" TEXT,
    "symptoms" TEXT NOT NULL DEFAULT '[]',
    "symptomsDuration" TEXT,
    "aiSummary" TEXT,
    "urgencyLevel" TEXT NOT NULL DEFAULT 'LOW',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "conversationState" TEXT NOT NULL DEFAULT 'INIT',
    "conversationHistory" TEXT NOT NULL DEFAULT '[]',
    "detectedLanguage" TEXT NOT NULL DEFAULT 'hinglish',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "consultations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_consultations" ("aiSummary", "conversationHistory", "conversationState", "createdAt", "id", "patientId", "status", "symptoms", "symptomsDuration", "updatedAt", "urgencyLevel", "voiceTranscript") SELECT "aiSummary", "conversationHistory", "conversationState", "createdAt", "id", "patientId", "status", "symptoms", "symptomsDuration", "updatedAt", "urgencyLevel", "voiceTranscript" FROM "consultations";
DROP TABLE "consultations";
ALTER TABLE "new_consultations" RENAME TO "consultations";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
