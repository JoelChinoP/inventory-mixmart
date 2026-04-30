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
    // DB_DIRECT_URL is used for Prisma CLI, migrations, and seed.
    url: getDirectDatabaseUrl(),
  },
});
