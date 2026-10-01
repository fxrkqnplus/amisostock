import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run database migrations.');
}

const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
try {
  await migrate(drizzle(pool), {
    migrationsFolder: fileURLToPath(new URL('../migrations/', import.meta.url)),
  });
  process.stdout.write('Database migrations applied.\n');
} finally {
  await pool.end();
}
