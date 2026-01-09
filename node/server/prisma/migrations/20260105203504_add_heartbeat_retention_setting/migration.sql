-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_cleanup_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "activity_retention_days" INTEGER NOT NULL DEFAULT 90,
    "screenshot_retention_days" INTEGER NOT NULL DEFAULT 30,
    "audit_retention_days" INTEGER NOT NULL DEFAULT 180,
    "heartbeat_retention_hours" INTEGER NOT NULL DEFAULT 48,
    "delete_drive_files" BOOLEAN NOT NULL DEFAULT false,
    "last_cleanup_run" DATETIME,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_cleanup_settings" ("activity_retention_days", "audit_retention_days", "delete_drive_files", "id", "last_cleanup_run", "screenshot_retention_days", "updated_at") SELECT "activity_retention_days", "audit_retention_days", "delete_drive_files", "id", "last_cleanup_run", "screenshot_retention_days", "updated_at" FROM "cleanup_settings";
DROP TABLE "cleanup_settings";
ALTER TABLE "new_cleanup_settings" RENAME TO "cleanup_settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
