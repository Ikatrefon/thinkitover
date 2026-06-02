-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Board" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bgColor" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Board_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Board" ("createdAt", "id", "title", "updatedAt", "userId") SELECT "createdAt", "id", "title", "updatedAt", "userId" FROM "Board";
DROP TABLE "Board";
ALTER TABLE "new_Board" RENAME TO "Board";
CREATE TABLE "new_Thread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boardId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New chat',
    "posX" REAL NOT NULL DEFAULT 0,
    "posY" REAL NOT NULL DEFAULT 0,
    "headerBg" TEXT NOT NULL DEFAULT '',
    "nodeBg" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Thread_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Thread" ("boardId", "createdAt", "headerBg", "id", "posX", "posY", "title") SELECT "boardId", "createdAt", "headerBg", "id", "posX", "posY", "title" FROM "Thread";
DROP TABLE "Thread";
ALTER TABLE "new_Thread" RENAME TO "Thread";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
