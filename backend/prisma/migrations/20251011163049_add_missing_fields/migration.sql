/*
  Warnings:

  - Added the required column `punti` to the `Score` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Task" ADD COLUMN "qualitaFinale" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatar" TEXT;

-- CreateTable
CREATE TABLE "TeamScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "punti" INTEGER NOT NULL,
    "periodo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Score" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "puntiBase" INTEGER NOT NULL,
    "punti" INTEGER NOT NULL,
    "moltiplicatore" REAL NOT NULL DEFAULT 1.0,
    "bonusPuntualita" REAL NOT NULL DEFAULT 0.0,
    "malusPuntualita" REAL NOT NULL DEFAULT 0.0,
    "puntiTotali" INTEGER NOT NULL,
    "periodo" TEXT,
    "breakdown" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Score_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Score_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Score" ("bonusPuntualita", "breakdown", "createdAt", "id", "malusPuntualita", "moltiplicatore", "puntiBase", "puntiTotali", "taskId", "userId") SELECT "bonusPuntualita", "breakdown", "createdAt", "id", "malusPuntualita", "moltiplicatore", "puntiBase", "puntiTotali", "taskId", "userId" FROM "Score";
DROP TABLE "Score";
ALTER TABLE "new_Score" RENAME TO "Score";
CREATE INDEX "Score_userId_idx" ON "Score"("userId");
CREATE INDEX "Score_taskId_idx" ON "Score"("taskId");
CREATE INDEX "Score_createdAt_idx" ON "Score"("createdAt");
CREATE INDEX "Score_periodo_idx" ON "Score"("periodo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TeamScore_teamId_idx" ON "TeamScore"("teamId");

-- CreateIndex
CREATE INDEX "TeamScore_userId_idx" ON "TeamScore"("userId");

-- CreateIndex
CREATE INDEX "TeamScore_periodo_idx" ON "TeamScore"("periodo");
