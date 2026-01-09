/*
  Warnings:

  - A unique constraint covering the columns `[provider]` on the table `oauth_tokens` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "audit_events_is_flagged_acknowledged_idx" ON "audit_events"("is_flagged", "acknowledged");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_tokens_provider_key" ON "oauth_tokens"("provider");
