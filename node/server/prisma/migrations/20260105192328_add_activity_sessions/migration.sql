-- CreateTable
CREATE TABLE "activity_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "machine_id" TEXT NOT NULL,
    "start_time" INTEGER NOT NULL,
    "end_time" INTEGER NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "process_name" TEXT,
    "active_window" TEXT,
    "username" TEXT,
    "heartbeat_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_sessions_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_oauth_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "scope" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_oauth_tokens" ("access_token", "created_at", "expires_at", "id", "provider", "refresh_token", "scope", "updated_at") SELECT "access_token", "created_at", "expires_at", "id", "provider", "refresh_token", "scope", "updated_at" FROM "oauth_tokens";
DROP TABLE "oauth_tokens";
ALTER TABLE "new_oauth_tokens" RENAME TO "oauth_tokens";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "activity_sessions_machine_id_start_time_end_time_idx" ON "activity_sessions"("machine_id", "start_time", "end_time");
