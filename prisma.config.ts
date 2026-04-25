import 'dotenv/config';
import { defineConfig } from 'prisma/config';

import { getDirectDatabaseUrl } from './src/lib/database-url';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx ./prisma/seed.ts',
  },
  datasource: {
    // DIRECT_URL is optional for local migrations/CLI and falls back to DATABASE_URL.
    url: getDirectDatabaseUrl(),
  },
});
