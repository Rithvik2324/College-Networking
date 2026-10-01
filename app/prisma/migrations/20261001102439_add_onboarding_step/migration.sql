-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'student',
    "college" TEXT,
    "department" TEXT,
    "yearOfStudy" INTEGER,
    "avatarUrl" TEXT,
    "intent" TEXT NOT NULL DEFAULT 'Project-Building',
    "primarySkill" TEXT NOT NULL DEFAULT 'Frontend',
    "availability" INTEGER NOT NULL DEFAULT 8,
    "bio" TEXT NOT NULL DEFAULT '',
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "onboardingStep" INTEGER NOT NULL DEFAULT 1,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("availability", "avatarUrl", "bio", "college", "createdAt", "department", "email", "id", "intent", "name", "notificationsEnabled", "onboardingComplete", "passwordHash", "primarySkill", "role", "updatedAt", "yearOfStudy") SELECT "availability", "avatarUrl", "bio", "college", "createdAt", "department", "email", "id", "intent", "name", "notificationsEnabled", "onboardingComplete", "passwordHash", "primarySkill", "role", "updatedAt", "yearOfStudy" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
