-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_machines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "hostname" TEXT,
    "ip_address" TEXT,
    "registration_date" DATETIME NOT NULL,
    "last_seen" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "api_key" TEXT NOT NULL,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_machines" ("api_key", "created_at", "displayName", "hostname", "id", "ip_address", "last_seen", "metadata", "name", "registration_date") SELECT "api_key", "created_at", "displayName", "hostname", "id", "ip_address", "last_seen", "metadata", "name", "registration_date" FROM "machines";
DROP TABLE "machines";
ALTER TABLE "new_machines" RENAME TO "machines";
CREATE UNIQUE INDEX "machines_api_key_key" ON "machines"("api_key");
CREATE INDEX "machines_last_seen_idx" ON "machines"("last_seen");
CREATE INDEX "machines_status_idx" ON "machines"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
