import { defineConfig } from '@prisma/client/extension/config';

export default defineConfig({
    datasourceUrl: process.env.DATABASE_URL || 'file:./data/vorsight.db',
});
