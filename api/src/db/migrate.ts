import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  const pool = getPool();
  const migrationsDir = path.resolve(__dirname, '../../migrations');

  console.log(`[Database] Running migrations from: ${migrationsDir}`);
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create migrations tracker table if not present
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    for (const file of files) {
      const res = await client.query('SELECT 1 FROM _migrations WHERE filename = $1', [file]);
      if (res.rowCount === 0) {
        console.log(`[Database] Applying migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        await client.query(sql);
        await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
        console.log(`[Database] Applied: ${file}`);
      } else {
        console.log(`[Database] Migration already applied: ${file}`);
      }
    }

    await client.query('COMMIT');
    console.log('[Database] Migrations completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Database] Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Allow standalone execution: `npm run migrate`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
