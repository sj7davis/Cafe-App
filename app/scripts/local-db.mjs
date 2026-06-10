// Local dev database — embedded PostgreSQL, no Docker or system install needed.
// Usage: npm run db:local   (keep it running, then `npm run dev:all` in another terminal)
// Data persists in .pgdata/ (gitignored). Matches DATABASE_URL in .env.example.
import EmbeddedPostgres from 'embedded-postgres';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const pg = new EmbeddedPostgres({
  databaseDir: path.join(root, '.pgdata'),
  user: 'postgres',
  password: 'password',
  port: 5432,
  persistent: true,
});

const fresh = !(await import('node:fs')).existsSync(path.join(root, '.pgdata', 'PG_VERSION'));
if (fresh) {
  console.log('[local-db] initialising new cluster in .pgdata/ ...');
  await pg.initialise();
}
await pg.start();
if (fresh) {
  await pg.createDatabase('b1_platform');
  console.log('[local-db] created database b1_platform');
}
console.log('[local-db] PostgreSQL running on postgres://postgres:password@localhost:5432/b1_platform');
console.log('[local-db] Ctrl+C to stop.');

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    console.log('\n[local-db] stopping...');
    await pg.stop();
    process.exit(0);
  });
}
