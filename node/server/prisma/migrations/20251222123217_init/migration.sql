-- CreateTable
CREATE TABLE "machines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "hostname" TEXT,
    "ip_address" TEXT,
    "registration_date" DATETIME NOT NULL,
    "last_seen" DATETIME,
    "api_key" TEXT NOT NULL,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "machine_state" (
    "machine_id" TEXT NOT NULL PRIMARY KEY,
    "last_activity_time" DATETIME,
    "active_window" TEXT,
    "screenshot_count" INTEGER NOT NULL DEFAULT 0,
    "upload_count" INTEGER NOT NULL DEFAULT 0,
    "health_status" TEXT,
    "settings" TEXT,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "machine_state_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "activity_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "machine_id" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "active_window" TEXT,
    "process_name" TEXT,
    "duration" INTEGER,
    "username" TEXT,
    CONSTRAINT "activity_history_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "screenshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "machine_id" TEXT NOT NULL,
    "capture_time" DATETIME NOT NULL,
    "trigger_type" TEXT,
    "google_drive_file_id" TEXT,
    "local_path" TEXT,
    "is_uploaded" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "screenshots_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "settings_queue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "machine_id" TEXT NOT NULL,
    "settings" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_at" DATETIME,
    CONSTRAINT "settings_queue_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "machine_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT,
    "username" TEXT,
    "timestamp" DATETIME NOT NULL,
    "details" TEXT,
    "source_log_name" TEXT,
    "is_flagged" BOOLEAN NOT NULL DEFAULT true,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_events_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "connection_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "machine_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,
    CONSTRAINT "connection_events_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "oauth_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "scope" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "machines_api_key_key" ON "machines"("api_key");

-- CreateIndex
CREATE INDEX "machines_last_seen_idx" ON "machines"("last_seen");

-- CreateIndex
CREATE INDEX "activity_history_machine_id_timestamp_idx" ON "activity_history"("machine_id", "timestamp");

-- CreateIndex
CREATE INDEX "screenshots_machine_id_capture_time_idx" ON "screenshots"("machine_id", "capture_time");

-- CreateIndex
CREATE INDEX "audit_events_machine_id_timestamp_idx" ON "audit_events"("machine_id", "timestamp");

-- CreateIndex
CREATE INDEX "connection_events_machine_id_timestamp_idx" ON "connection_events"("machine_id", "timestamp");

-- CreateTable
CREATE TABLE "cleanup_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "activity_retention_days" INTEGER NOT NULL DEFAULT 90,
    "screenshot_retention_days" INTEGER NOT NULL DEFAULT 30,
    "audit_retention_days" INTEGER NOT NULL DEFAULT 180,
    "delete_drive_files" BOOLEAN NOT NULL DEFAULT false,
    "last_cleanup_run" DATETIME,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default cleanup settings
INSERT INTO cleanup_settings (id) VALUES (1);
