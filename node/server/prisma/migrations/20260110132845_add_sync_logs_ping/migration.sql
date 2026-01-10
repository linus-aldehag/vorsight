-- AlterTable
ALTER TABLE "machine_state" ADD COLUMN "applied_settings" TEXT;
ALTER TABLE "machine_state" ADD COLUMN "last_ping_success" DATETIME;
ALTER TABLE "machine_state" ADD COLUMN "last_ping_time" DATETIME;
ALTER TABLE "machine_state" ADD COLUMN "ping_latency" INTEGER;

-- CreateTable
CREATE TABLE "machine_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "machine_id" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "exception" TEXT,
    "source_context" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "machine_logs_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "machine_logs_machine_id_timestamp_idx" ON "machine_logs"("machine_id", "timestamp");

-- CreateIndex
CREATE INDEX "machine_logs_level_idx" ON "machine_logs"("level");
